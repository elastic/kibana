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
import type { Streams } from '@kbn/streams-schema';
import type {
  IndicesDataStreamFailureStore,
  IndicesSimulateTemplateTemplate,
} from '@elastic/elasticsearch/lib/api/types';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';
import { isDslLifecycle, isIlmLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import {
  isDisabledLifecycleFailureStore,
  isEnabledLifecycleFailureStore,
  isInheritFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import { getErrorMessage, parseError } from '../errors/parse_error';
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
  } catch (error) {
    const { type, message } = parseError(error);
    if (type !== 'resource_already_exists_exception') {
      logger.error(`Error creating data stream: ${message}`);
      throw error;
    }
  }
}

export async function deleteDataStream({ esClient, name, logger }: DeleteDataStreamOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteDataStream({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error) {
    logger.error(`Error deleting data stream: ${getErrorMessage(error)}`);
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
    mappings: Record<string, unknown>;
    effective_mappings: Record<string, unknown>;
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
              settings: {
                'index.lifecycle.name': null,
                'index.lifecycle.prefer_ilm': null,
              },
            });
          }
        })
      );
    }
  } catch (err) {
    logger.error(`Error updating data stream lifecycle: ${getErrorMessage(err)}`);
    throw err;
  }
}

export async function putDataStreamsSettings({
  esClient,
  names,
  settings,
}: {
  esClient: ElasticsearchClient;
  names: string[];
  settings: {
    'index.lifecycle.name'?: string | null;
    'index.lifecycle.prefer_ilm'?: boolean | null;
    'index.number_of_replicas'?: number | null;
    'index.number_of_shards'?: number | null;
    'index.refresh_interval'?: string | -1 | null;
  };
}) {
  const response = await retryTransientEsErrors(() =>
    esClient.indices.putDataStreamSettings({
      name: names,
      settings,
    })
  );
  const errors = response.data_streams
    .filter(({ error }) => Boolean(error))
    .map(({ error }) => error);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
}

export async function updateDataStreamsFailureStore({
  esClient,
  logger,
  failureStore,
  stream,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  failureStore: FailureStore;
  stream: Streams.all.Definition;
  isServerless: boolean;
}) {
  try {
    let failureStoreConfig: IndicesDataStreamFailureStore;

    // Handle { inherit: {} }
    if (isInheritFailureStore(failureStore)) {
      const response = await retryTransientEsErrors(
        () => esClient.indices.simulateIndexTemplate({ name: stream.name }),
        { logger }
      );
      // If not template, disable the failure store. Empty object would cause Elasticsearch error.
      // @ts-expect-error index simulate response is not well typed
      failureStoreConfig = response.template?.data_stream_options?.failure_store ?? {
        enabled: false,
      };
    } else if (isEnabledLifecycleFailureStore(failureStore)) {
      // Handle { lifecycle: { enabled: { data_retention?: string } } }
      const dataRetention = failureStore.lifecycle.enabled?.data_retention;
      failureStoreConfig = {
        enabled: true,
        ...(dataRetention ? { lifecycle: { data_retention: dataRetention, enabled: true } } : {}),
      };
    } else if (isDisabledLifecycleFailureStore(failureStore)) {
      // Handle { lifecycle: { disabled: {} } }
      // lifecycle cannot be disabled in serverless
      failureStoreConfig = {
        enabled: true,
        ...(isServerless ? {} : { lifecycle: { enabled: false } }),
      };
    } else {
      // Handle { disabled: {} }
      failureStoreConfig = {
        enabled: false,
      };
    }

    await retryTransientEsErrors(
      () =>
        esClient.indices.putDataStreamOptions(
          {
            name: stream.name,
            failure_store: failureStoreConfig,
          },
          { meta: true }
        ),
      { logger }
    );
  } catch (err) {
    logger.error(`Error updating data stream failure store: ${getErrorMessage(err)}`);
    throw err;
  }
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
