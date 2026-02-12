/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { get } from 'lodash';
import type {
  IndicesDataStream,
  IndicesSimulateIndexTemplateResponse,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  CreateConcreteWriteIndexOpts,
  ConcreteIndexInfo,
} from './create_concrete_write_index';
import {
  updateIndexMappingsAndSettings,
  findOrSetConcreteWriteIndex,
} from './create_concrete_write_index';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import type { IIndexPatternString } from '../resource_installer_utils';

export interface DataStreamAdapter {
  isUsingDataStreams(): boolean;
  getIndexTemplateFields(alias: string, patterns: string[]): IndexTemplateFields;
  createStream(opts: CreateConcreteWriteIndexOpts): Promise<void>;
}

export interface BulkOpProperties {
  require_alias: boolean;
}

export interface IndexTemplateFields {
  data_stream?: { hidden: true };
  index_patterns: string[];
  rollover_alias?: string;
}

export interface GetDataStreamAdapterOpts {
  useDataStreamForAlerts: boolean;
}

export function getDataStreamAdapter(opts: GetDataStreamAdapterOpts): DataStreamAdapter {
  if (opts.useDataStreamForAlerts) {
    return new DataStreamImplementation();
  } else {
    return new AliasImplementation();
  }
}

// implementation using data streams
class DataStreamImplementation implements DataStreamAdapter {
  isUsingDataStreams(): boolean {
    return true;
  }

  getIndexTemplateFields(alias: string, patterns: string[]): IndexTemplateFields {
    return {
      data_stream: { hidden: true },
      index_patterns: [alias],
    };
  }

  async createStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
    return createDataStream(opts);
  }
}

// implementation using aliases and backing indices
class AliasImplementation implements DataStreamAdapter {
  isUsingDataStreams(): boolean {
    return false;
  }

  getIndexTemplateFields(alias: string, patterns: string[]): IndexTemplateFields {
    return {
      index_patterns: patterns,
      rollover_alias: alias,
    };
  }

  async createStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
    return createAliasStream(opts);
  }
}

async function createDataStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.debug(`Creating data stream - ${indexPatterns.alias}`);

  // check if data stream exists
  let dataStream: IndicesDataStream | undefined;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: indexPatterns.alias, expand_wildcards: 'all' }),
      { logger }
    );
    dataStream = response.data_streams[0];
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${indexPatterns.alias} - ${error.message}`);
      throw error;
    }
  }

  // if a data stream exists, update the underlying mapping
  if (dataStream) {
    const simulatedMapping = await simulateIndexMapping({
      logger,
      esClient,
      index: indexPatterns.alias,
    });
    try {
      await updateIndexMappingsAndSettings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndices: [
          {
            alias: indexPatterns.alias,
            index: indexPatterns.alias,
            isWriteIndex: true,
          },
        ],
        simulatedMapping,
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for data stream: ${indexPatterns.alias}, updating write index (${
          dataStream.indices[dataStream.indices.length - 1].index_name
        }) mappings instead`
      );
      try {
        await updateIndexMappingsAndSettings({
          logger,
          esClient,
          totalFieldsLimit,
          concreteIndices: [
            {
              alias: indexPatterns.alias,
              index: dataStream.indices[dataStream.indices.length - 1].index_name,
              isWriteIndex: true,
            },
          ],
          simulatedMapping,
        });
      } catch (innerError) {
        logger.error(
          `Failed to update mappings for write index of data stream: ${indexPatterns.alias}, rolling over instead`
        );
        await retryTransientEsErrors(
          () => esClient.indices.rollover({ alias: indexPatterns.alias }),
          { logger }
        );
      }
    }
  } else {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.createDataStream({
            name: indexPatterns.alias,
          }),
        { logger }
      );
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating data stream ${indexPatterns.alias} - ${error.message}`);
        throw error;
      }
    }
  }
}

async function getValidConcreteIndices({
  indexPatterns,
  logger,
  esClient,
}: {
  indexPatterns: IIndexPatternString;
  logger: Logger;
  esClient: ElasticsearchClient;
}): Promise<ConcreteIndexInfo[]> {
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const patterns: string[] = [indexPatterns.pattern];
    if (indexPatterns.reindexedPattern) {
      patterns.push(indexPatterns.reindexedPattern);
    }

    const response = await retryTransientEsErrors(
      () =>
        esClient.indices.getAlias({
          index: patterns,
          name: indexPatterns.alias,
        }),
      { logger }
    );

    const concreteIndices = Object.entries(response).flatMap(([index, { aliases }]) =>
      Object.entries(aliases).map(([aliasName, aliasProperties]) => ({
        index,
        alias: aliasName,
        isWriteIndex: aliasProperties.is_write_index ?? false,
      }))
    );

    logger.info(
      () =>
        `Found ${concreteIndices.length} concrete indices for ${
          indexPatterns.name
        } - ${JSON.stringify(concreteIndices)}`
    );

    if (indexPatterns.validPrefixes) {
      const validConcreteIndices = [];
      for (const cIdx of concreteIndices) {
        if (!indexPatterns.validPrefixes.some((prefix: string) => cIdx.index.startsWith(prefix))) {
          logger.warn(
            `Found unexpected concrete index name "${
              cIdx.index
            }" while expecting index with one of the following prefixes: [${indexPatterns.validPrefixes.join(
              ','
            )}] Not updating mappings or settings for this index.`
          );
        } else {
          validConcreteIndices.push(cIdx);
        }
      }
      return validConcreteIndices;
    } else {
      return concreteIndices;
    }
  } catch (error) {
    // 404 is expected if no concrete write indices have been created
    if (error.statusCode !== 404) {
      logger.error(
        `Error fetching concrete indices for ${indexPatterns.pattern} pattern - ${error.message}`
      );
      throw error;
    } else {
      return [];
    }
  }
}

async function simulateIndexMapping({
  logger,
  esClient,
  index,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  index: string;
}): Promise<MappingTypeMapping | undefined> {
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for ${index}; error generating simulated mappings: ${err.message}`
    );
    return;
  }
  const mapping = get(simulatedIndexMapping, ['template', 'mappings']);
  if (mapping == null) {
    logger.error(`Ignored PUT mappings for ${index}; simulated mappings were empty`);
  }
  return mapping;
}

async function createAliasStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.debug(`Creating concrete write index - ${indexPatterns.name}`);

  const validConcreteIndices = await getValidConcreteIndices({
    indexPatterns,
    esClient,
    logger,
  });

  // if a concrete write index already exists, update the underlying mapping
  if (validConcreteIndices.length > 0) {
    const concreteWriteIndex = await findOrSetConcreteWriteIndex({
      logger,
      esClient,
      concreteIndices: validConcreteIndices,
      alias: indexPatterns.alias,
    });

    const nonWriteIndices = validConcreteIndices.filter(
      (index) => index.index !== concreteWriteIndex.index
    );
    const simulatedMapping = await simulateIndexMapping({
      logger,
      esClient,
      index: concreteWriteIndex.index,
    });
    // Update the mappings for all indices other than the write index, if this fails, log an error but continue on
    try {
      await updateIndexMappingsAndSettings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndices: nonWriteIndices,
        simulatedMapping,
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for concrete indices matching: ${indexPatterns.pattern}`
      );
    }

    // For the write index, try updating the mappings. If this fails, try rolling over. If rolling over fails,
    // throw an error.
    try {
      await updateIndexMappingsAndSettings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndices: [concreteWriteIndex],
        simulatedMapping,
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for write index of alias: ${concreteWriteIndex.alias}, rolling over instead`
      );
      await retryTransientEsErrors(
        () => esClient.indices.rollover({ alias: concreteWriteIndex.alias }),
        { logger }
      );
    }
  } else {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.create({
            index: indexPatterns.name,
            aliases: {
              [indexPatterns.alias]: {
                is_write_index: true,
              },
            },
          }),
        { logger }
      );
    } catch (error) {
      logger.error(`Error creating concrete write index - ${error.message}`);
      // If the index already exists and it's the write index for the alias,
      // something else created it so suppress the error. If it's not the write
      // index, that's bad, throw an error.
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const existingIndices = await retryTransientEsErrors(
          () => esClient.indices.get({ index: indexPatterns.name }),
          { logger }
        );
        if (!existingIndices[indexPatterns.name]?.aliases?.[indexPatterns.alias]?.is_write_index) {
          throw Error(
            `Attempted to create index: ${indexPatterns.name} as the write index for alias: ${indexPatterns.alias}, but the index already exists and is not the write index for the alias`
          );
        }
      } else {
        throw error;
      }
    }
  }
}
