/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get, sortBy } from 'lodash';
import type { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import type { DataStreamAdapter } from './data_stream_adapter';
import { updateIndexTemplateFieldsLimit } from './update_index_template_fields_limit';

export interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  validIndexPrefixes?: string[];
  concreteIndices: ConcreteIndexInfo[];
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  concreteIndexInfo: ConcreteIndexInfo;
  attempt?: number;
}

const MAX_FIELDS_LIMIT_INCREASE_ATTEMPTS = 100;

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndexInfo,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index,
          settings: {
            'index.mapping.total_fields.limit': totalFieldsLimit,
            'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
          },
        }),
      { logger }
    );
    return;
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for ${alias}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings of backing indices but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateUnderlyingMapping = async ({
  logger,
  esClient,
  concreteIndexInfo,
  attempt = 1,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for ${alias}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for ${alias}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, ...simulatedMapping }),
      { logger }
    );

    return;
  } catch (err) {
    if (attempt <= MAX_FIELDS_LIMIT_INCREASE_ATTEMPTS) {
      try {
        const newLimit = await increaseFieldsLimit({
          err,
          esClient,
          concreteIndexInfo,
          logger,
          increment: attempt,
        });
        if (newLimit) {
          logger.debug(
            `Retrying PUT mapping for ${alias} with increased total_fields.limit of ${newLimit}. Attempt: ${attempt}`
          );
          await updateUnderlyingMapping({
            logger,
            esClient,
            concreteIndexInfo,
            totalFieldsLimit: newLimit,
            attempt: attempt + 1,
          });
          return;
        }
      } catch (e) {
        logger.error(
          `An error occured while increasing total_fields.limit of ${alias} - ${e.message}`,
          e
        );
        // Throw the original error
        throw err;
      }
    }

    logger.error(`Failed to PUT mapping for ${alias}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the underlying mapping for any existing concrete indices
 */
export const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndices,
  validIndexPrefixes,
}: UpdateIndexMappingsOpts) => {
  let validConcreteIndices = [];
  if (validIndexPrefixes) {
    for (const cIdx of concreteIndices) {
      if (!validIndexPrefixes?.some((prefix: string) => cIdx.index.startsWith(prefix))) {
        logger.warn(
          `Found unexpected concrete index name "${
            cIdx.index
          }" while expecting index with one of the following prefixes: [${validIndexPrefixes.join(
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

  logger.debug(
    `Updating underlying mappings for ${validConcreteIndices.length} indices / data streams.`
  );

  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );

  // Update mappings of the found indices.
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateUnderlyingMapping({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );
};

export interface CreateConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  indexPatterns: IIndexPatternString;
  dataStreamAdapter: DataStreamAdapter;
}
/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
export const createConcreteWriteIndex = async (opts: CreateConcreteWriteIndexOpts) => {
  await opts.dataStreamAdapter.createStream(opts);
};

interface SetConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  concreteIndices: ConcreteIndexInfo[];
}

export async function setConcreteWriteIndex(opts: SetConcreteWriteIndexOpts) {
  const { logger, esClient, concreteIndices } = opts;
  const lastIndex = concreteIndices.length - 1;
  const concreteIndex = sortBy(concreteIndices, ['index'])[lastIndex];
  logger.debug(
    `Attempting to set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
  );
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.updateAliases({
          actions: [
            { remove: { index: concreteIndex.index, alias: concreteIndex.alias } },
            {
              add: {
                index: concreteIndex.index,
                alias: concreteIndex.alias,
                is_write_index: true,
              },
            },
          ],
        }),
      { logger }
    );
    logger.info(
      `Successfully set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
    );
  } catch (error) {
    throw new Error(
      `Failed to set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
    );
  }
}

const increaseFieldsLimit = async ({
  err,
  esClient,
  concreteIndexInfo,
  logger,
  increment,
}: {
  err: Error;
  esClient: ElasticsearchClient;
  concreteIndexInfo: ConcreteIndexInfo;
  logger: Logger;
  increment: number;
}): Promise<number | undefined> => {
  const { alias } = concreteIndexInfo;
  const match = err.message
    ? err.message.match(/Limit of total fields \[(\d+)\] has been exceeded/)
    : null;

  if (match !== null) {
    const exceededLimit = parseInt(match[1], 10);
    const newLimit = exceededLimit + increment;

    const { index_templates: indexTemplates } = await retryTransientEsErrors(
      () =>
        esClient.indices.getIndexTemplate({
          name: `${alias}-index-template`,
        }),
      { logger }
    );

    if (indexTemplates.length <= 0) {
      logger.error(`No index template found for ${alias}`);
      return;
    }
    const template = indexTemplates[0];

    // Update the limit in the index
    await updateTotalFieldLimitSetting({
      logger,
      esClient,
      totalFieldsLimit: newLimit,
      concreteIndexInfo,
    });
    // Update the limit in the index template
    await retryTransientEsErrors(
      () => updateIndexTemplateFieldsLimit({ esClient, template, limit: newLimit }),
      { logger }
    );
    logger.info(
      `total_fields.limit of ${alias} has been increased from ${exceededLimit} to ${newLimit}`
    );

    return newLimit;
  }
};
