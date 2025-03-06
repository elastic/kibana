/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { IngestStreamLifecycle, isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
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

interface RolloverDataStreamOptions {
  esClient: ElasticsearchClient;
  name: string;
  mappings: MappingTypeMapping['properties'] | undefined;
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

export async function rolloverDataStreamIfNecessary({
  esClient,
  name,
  logger,
  mappings,
}: RolloverDataStreamOptions) {
  const dataStreams = await esClient.indices.getDataStream({ name: `${name},${name}.*` });
  for (const dataStream of dataStreams.data_streams) {
    const writeIndex = dataStream.indices.at(-1);
    if (!writeIndex) {
      continue;
    }
    try {
      await retryTransientEsErrors(
        () => esClient.indices.putMapping({ index: writeIndex.index_name, properties: mappings }),
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
