/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IngestStreamLifecycle,
  IngestStreamLifecycleDSL,
  IngestStreamLifecycleDisabled,
  IngestStreamLifecycleILM,
} from '@kbn/streams-schema';
import type { IndicesSimulateTemplateTemplate } from '@elastic/elasticsearch/lib/api/types';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';
import { isDslLifecycle, isIlmLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import { retryTransientEsErrors } from '../helpers/retry';

interface DataStreamManagementOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface DeleteDataStreamOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface UpdateOrRolloverDataStreamOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface UpdateDataStreamsMappingsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  name: string;
  mappings: StreamsMappingProperties;
}

interface UpdateDefaultIngestPipelineOptions {
  esClient: ElasticsearchClient;
  name: string;
  pipeline: string | undefined;
}

export async function upsertDataStream({ esClient, name, logger }: DataStreamManagementOptions) {
  const dataStreamExists = await esClient.indices.exists({ index: name });
  if (dataStreamExists) {
    return;
  }
  try {
    await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
    logger.debug(() => `Installed data stream: ${name}`);
  } catch (error: any) {
    logger.error(`Error creating data stream: ${error.message}`);
    throw error;
  }
}

export async function deleteDataStream({ esClient, name, logger }: DeleteDataStreamOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteDataStream({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting data stream: ${error.message}`);
    throw error;
  }
}

export async function rolloverDataStream({
  esClient,
  name,
  logger,
}: UpdateOrRolloverDataStreamOptions) {
  await retryTransientEsErrors(() => esClient.indices.rollover({ alias: name, lazy: true }), {
    logger,
  });
}

export async function updateDefaultIngestPipeline({
  esClient,
  name,
  pipeline,
}: UpdateDefaultIngestPipelineOptions) {
  const dataStreams = await esClient.indices.getDataStream({ name });
  for (const dataStream of dataStreams.data_streams) {
    const writeIndex = dataStream.indices.at(-1);
    if (!writeIndex) {
      continue;
    }
    await esClient.indices.putSettings({
      index: writeIndex.index_name,
      settings: {
        'index.default_pipeline': pipeline,
      },
    });
  }
}

// TODO: Remove once client lib has been updated
export interface DataStreamMappingsUpdateResponse {
  data_streams: Array<{
    name: string;
    applied_to_data_stream: boolean;
    error?: string;
    mappings: Record<string, any>;
    effective_mappings: Record<string, any>;
  }>;
}

export async function updateDataStreamsMappings({
  esClient,
  logger,
  name,
  mappings,
}: UpdateDataStreamsMappingsOptions) {
  // update the mappings on the data stream level
  const response = (await esClient.transport.request({
    method: 'PUT',
    path: `/_data_stream/${name}/_mappings`,
    body: {
      properties: mappings,
      _meta: {
        managed_by: 'streams',
      },
    },
  })) as DataStreamMappingsUpdateResponse;
  if (response.data_streams.length === 0) {
    throw new Error(`Data stream ${name} not found`);
  }
  if (response.data_streams[0].error) {
    throw new Error(
      `Error updating data stream mappings for ${name}: ${response.data_streams[0].error}`
    );
  }
  await retryTransientEsErrors(() => esClient.indices.rollover({ alias: name, lazy: true }), {
    logger,
  });
}

export async function updateDataStreamsLifecycle({
  esClient,
  logger,
  names,
  lifecycle,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  names: string[];
  lifecycle: IngestStreamLifecycle;
  isServerless: boolean;
}) {
  try {
    if (isIlmLifecycle(lifecycle)) {
      await putDataStreamsSettings({
        esClient,
        names,
        logger,
        settings: {
          'index.lifecycle.name': lifecycle.ilm.policy,
          'index.lifecycle.prefer_ilm': true,
        },
      });
    } else if (isDslLifecycle(lifecycle)) {
      await retryTransientEsErrors(
        () =>
          esClient.indices.putDataLifecycle({
            name: names,
            data_retention: lifecycle.dsl.data_retention,
          }),
        { logger }
      );

      if (!isServerless) {
        // we don't need overrides for serverless since data streams can
        // only be managed by dsl
        await putDataStreamsSettings({
          esClient,
          names,
          logger,
          settings: {
            'index.lifecycle.name': null,
            'index.lifecycle.prefer_ilm': false,
          },
        });
      }
    } else if (isInheritLifecycle(lifecycle)) {
      // classic streams only - inheriting a lifecycle means falling back to
      // the template configuration. if we find a DSL we need to set it
      // explicitly since there is no way to fall back to the template value,
      // for ILM or disabled we only have to unset any overrides
      await Promise.all(
        names.map(async (name) => {
          const { template } = (await retryTransientEsErrors(
            () => esClient.indices.simulateIndexTemplate({ name }),
            {
              logger,
            }
          )) as {
            template: IndicesSimulateTemplateTemplate & {
              lifecycle?: { enabled: boolean; data_retention?: string };
            };
          };

          const templateLifecycle = getTemplateLifecycle(template);
          if (isDslLifecycle(templateLifecycle)) {
            await retryTransientEsErrors(
              () =>
                esClient.indices.putDataLifecycle({
                  name,
                  data_retention: templateLifecycle.dsl.data_retention,
                }),
              { logger }
            );
          } else {
            await retryTransientEsErrors(() => esClient.indices.deleteDataLifecycle({ name }), {
              logger,
            });
          }

          if (!isServerless) {
            // unset any overriden settings
            await putDataStreamsSettings({
              esClient,
              names: [name],
              logger,
              settings: {
                'index.lifecycle.name': null,
                'index.lifecycle.prefer_ilm': null,
              },
            });
          }
        })
      );
    }
  } catch (err: any) {
    logger.error(`Error updating data stream lifecycle: ${err.message}`);
    throw err;
  }
}

async function putDataStreamsSettings({
  esClient,
  names,
  logger,
  settings,
}: {
  esClient: ElasticsearchClient;
  names: string[];
  logger: Logger;
  settings: {
    'index.lifecycle.name'?: string | null;
    'index.lifecycle.prefer_ilm'?: boolean | null;
  };
}) {
  await retryTransientEsErrors(
    () =>
      // TODO: use client method once available
      esClient.transport.request({
        method: 'PUT',
        path: `/_data_stream/${names.join(',')}/_settings`,
        body: settings,
      }),
    { logger }
  );
}

export function getTemplateLifecycle(
  template: IndicesSimulateTemplateTemplate & {
    lifecycle?: { enabled: boolean; data_retention?: string };
  }
): IngestStreamLifecycleILM | IngestStreamLifecycleDSL | IngestStreamLifecycleDisabled {
  const toBoolean = (value: boolean | string | undefined): boolean => {
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 'true';
  };

  const hasEffectiveDsl =
    toBoolean(template.lifecycle?.enabled) &&
    !(
      toBoolean(template.settings.index?.lifecycle?.prefer_ilm) &&
      template.settings.index?.lifecycle?.name
    );
  if (hasEffectiveDsl) {
    return { dsl: { data_retention: template.lifecycle!.data_retention } };
  }

  if (template.settings.index?.lifecycle?.name) {
    // if dsl is not enabled and a policy is set, the ilm will be effective
    // regardless of the prefer_ilm setting
    return { ilm: { policy: template.settings.index.lifecycle.name } };
  }

  return { disabled: {} };
}
