/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type {
  CreateConcreteWriteIndexOpts,
  ConcreteIndexInfo,
} from './create_concrete_write_index';
import {
  updateAliasIndexMappings,
  findOrSetConcreteWriteIndex,
  updateDataStreamIndexMappings,
} from './create_concrete_write_index';
import { retryTransientEsErrors } from './retry_transient_es_errors';

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
    try {
      await updateDataStreamIndexMappings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndexInfo: {
          alias: indexPatterns.alias,
          index: indexPatterns.alias,
          isWriteIndex: true,
        },
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for data stream: ${indexPatterns.alias}, updating write index (${
          dataStream.indices[dataStream.indices.length - 1].index_name
        }) mappings instead`
      );
      try {
        await updateDataStreamIndexMappings({
          logger,
          esClient,
          totalFieldsLimit,
          concreteIndexInfo: {
            alias: indexPatterns.alias,
            index: dataStream.indices[dataStream.indices.length - 1].index_name,
            isWriteIndex: true,
          },
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

async function createAliasStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.debug(`Creating concrete write index - ${indexPatterns.name}`);

  // check if a concrete write index already exists
  let concreteIndices: ConcreteIndexInfo[] = [];
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

    concreteIndices = Object.entries(response).flatMap(([index, { aliases }]) =>
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
  } catch (error) {
    // 404 is expected if no concrete write indices have been created
    if (error.statusCode !== 404) {
      logger.error(
        `Error fetching concrete indices for ${indexPatterns.pattern} pattern - ${error.message}`
      );
      throw error;
    }
  }

  let validConcreteIndices = [];
  if (indexPatterns.validPrefixes) {
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
  } else {
    validConcreteIndices = concreteIndices;
  }

  // if a concrete write index already exists, update the underlying mapping
  if (validConcreteIndices.length > 0) {
    const concreteWriteIndex = await findOrSetConcreteWriteIndex({
      logger,
      esClient,
      concreteIndices,
      alias: indexPatterns.alias,
    });

    const nonWriteIndices = concreteIndices.filter(
      (index) => index.index !== concreteWriteIndex.index
    );
    // Update the mappings for all indices other than the write index, if this fails, log an error but continue on
    try {
      await updateAliasIndexMappings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndices: nonWriteIndices,
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for concrete indices matching: ${indexPatterns.pattern}`
      );
    }

    // For the write index, try updating the mappings. If this fails, try rolling over. If rolling over fails,
    // throw an error.
    try {
      await updateAliasIndexMappings({
        logger,
        esClient,
        totalFieldsLimit,
        concreteIndices: [concreteWriteIndex],
      });
    } catch (err) {
      logger.error(
        `Failed to update mappings for write index of alias: ${concreteWriteIndex.alias}, rolling over instead`
      );
      await esClient.indices.rollover({ alias: concreteWriteIndex.alias });
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
