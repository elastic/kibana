/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IngestStreamLifecycle, isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
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
    await retryTransientEsErrors(
      () =>
        esClient.indices.putDataLifecycle({
          name: names,
          data_retention: isDslLifecycle(lifecycle) ? lifecycle.dsl.data_retention : undefined,
        }),
      { logger }
    );

    // if we transition from ilm to dlm or vice versa, the rolled over backing
    // indices need to be updated or they'll retain the lifecycle configuration
    // set at the time of creation.
    // this is not needed for serverless since only dlm is allowed but in stateful
    // we update every indices while not always necessary. this should be optimized
    if (isServerless) {
      return;
    }

    const dataStreams = await esClient.indices.getDataStream({ name: names });
    const isIlm = isIlmLifecycle(lifecycle);

    for (const dataStream of dataStreams.data_streams) {
      logger.debug(`updating settings for data stream ${dataStream.name} backing indices`);
      await retryTransientEsErrors(
        () =>
          esClient.indices.putSettings({
            index: dataStream.indices.map((index) => index.index_name),
            settings: {
              'lifecycle.prefer_ilm': isIlm,
              'lifecycle.name': isIlm ? lifecycle.ilm.policy : null,
            },
          }),
        { logger }
      );
    }
  } catch (err: any) {
    logger.error(`Error updating data stream lifecycle: ${err.message}`);
    throw err;
  }
}
