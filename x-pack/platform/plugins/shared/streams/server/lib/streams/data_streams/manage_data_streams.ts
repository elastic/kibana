/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  IngestStreamLifecycle,
  IngestStreamLifecycleDSL,
  IngestStreamLifecycleDisabled,
  IngestStreamLifecycleILM,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
} from '@kbn/streams-schema';
import { IndicesSimulateTemplateTemplate } from '@elastic/elasticsearch/lib/api/types';
import { omit } from 'lodash';
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

export async function updateOrRolloverDataStream({
  esClient,
  name,
  logger,
}: UpdateOrRolloverDataStreamOptions) {
  const dataStreams = await esClient.indices.getDataStream({ name });
  for (const dataStream of dataStreams.data_streams) {
    // simulate index and try to patch the write index
    // if that doesn't work, roll it over
    const simulatedIndex = await esClient.indices.simulateIndexTemplate({
      name,
    });
    const writeIndex = dataStream.indices.at(-1);
    if (!writeIndex) {
      continue;
    }
    try {
      // Apply blocklist to avoid changing settings we don't want to
      const simulatedIndexSettings = omit(simulatedIndex.template.settings, [
        'index.codec',
        'index.mapping.ignore_malformed',
        'index.mode',
        'index.logsdb.sort_on_host_name',
      ]);

      await retryTransientEsErrors(
        () =>
          Promise.all([
            esClient.indices.putMapping({
              index: writeIndex.index_name,
              properties: simulatedIndex.template.mappings.properties,
            }),
            esClient.indices.putSettings({
              index: writeIndex.index_name,
              settings: simulatedIndexSettings,
            }),
          ]),
        {
          logger,
        }
      );
    } catch (error: any) {
      if (
        typeof error.message !== 'string' ||
        !error.message.includes('illegal_argument_exception')
      ) {
        throw error;
      }
      try {
        await retryTransientEsErrors(() => esClient.indices.rollover({ alias: dataStream.name }), {
          logger,
        });
        logger.debug(() => `Rolled over data stream: ${dataStream.name}`);
      } catch (rolloverError: any) {
        logger.error(`Error rolling over data stream: ${error.message}`);
        throw error;
      }
    }
  }
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
      await retryTransientEsErrors(() => esClient.indices.deleteDataLifecycle({ name: names }), {
        logger,
      });

      await putDataStreamsSettings({ esClient, names, logger, lifecycle });
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
        // we don't need overrides for serverless since it only allows DSL
        await putDataStreamsSettings({ esClient, names, logger, lifecycle });
      }
    } else if (isInheritLifecycle(lifecycle)) {
      // inheriting a lifecycle here means falling back to the template configuration
      // so we need to update streams individually.
      await Promise.all(
        names.map(async (name) => {
          const templateLifecycle = await getTemplateLifecycle({ esClient, name, logger });
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

          await putDataStreamsSettings({ esClient, names, logger, lifecycle: { inherit: {} } });
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
  lifecycle,
}: {
  esClient: ElasticsearchClient;
  names: string[];
  logger: Logger;
  lifecycle: IngestStreamLifecycle;
}) {
  const isIlm = isIlmLifecycle(lifecycle);
  const isInherit = isInheritLifecycle(lifecycle);

  await retryTransientEsErrors(
    () =>
      // TODO: use client method once available
      esClient.transport.request({
        method: 'PUT',
        path: `/_data_stream/${names.join(',')}/_settings`,
        body: {
          'index.lifecycle.name': isIlm ? lifecycle.ilm.policy : null,
          'index.lifecycle.prefer_ilm': isInherit ? null : isIlm,
        },
      }),
    { logger }
  );
}

async function getTemplateLifecycle({
  esClient,
  name,
  logger,
}: {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}): Promise<IngestStreamLifecycleILM | IngestStreamLifecycleDSL | IngestStreamLifecycleDisabled> {
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

  const hasEffectiveIlm =
    template.settings.index?.lifecycle?.name &&
    getBoolean(template.settings.index.lifecycle.prefer_ilm);
  if (hasEffectiveIlm) {
    return { ilm: { policy: template.settings.index!.lifecycle!.name! } };
  }

  const hasEffectiveDsl = !hasEffectiveIlm && getBoolean(template.lifecycle?.enabled);
  if (hasEffectiveDsl) {
    return { dsl: { data_retention: template.lifecycle!.data_retention } };
  }

  return { disabled: {} };
}

function getBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return false;
}
