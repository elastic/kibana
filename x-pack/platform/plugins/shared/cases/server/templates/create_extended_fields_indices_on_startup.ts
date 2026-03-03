/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OWNERS, CASE_SAVED_OBJECT } from '../../common/constants';
import { CASES_EXTENDED_FIELDS_INDEX_MAPPINGS } from './mappings';
import { getExtendedFieldsDestinationIndexName } from './constants';

const MAX_BUCKETS_LIMIT = 65535;

export const createExtendedFieldsIndicesOnStartup = async ({
  esClient,
  logger,
  savedObjectsClient,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const spaces = await getAllSpacesWithCases(savedObjectsClient);

  for (const spaceId of spaces) {
    for (const owner of OWNERS) {
      const indexName = getExtendedFieldsDestinationIndexName(spaceId, owner);

      try {
        const indexExists = await esClient.indices.exists({ index: indexName });

        if (indexExists) {
          continue;
        }

        await esClient.indices.create({
          index: indexName,
          mappings: CASES_EXTENDED_FIELDS_INDEX_MAPPINGS,
          settings: {
            index: {
              hidden: true,
            },
          },
        });

        logger.info(`Successfully created extended fields index [${indexName}]`);
      } catch (error) {
        logger.error(`Error creating extended fields index [${indexName}]: ${error}`);
      }
    }
  }
};

const getAllSpacesWithCases = async (savedObjectsClient: SavedObjectsClientContract) => {
  const response = await savedObjectsClient.find<
    unknown,
    {
      spaces: {
        buckets: Array<{
          key: string;
        }>;
      };
    }
  >({
    type: CASE_SAVED_OBJECT,
    page: 0,
    perPage: 0,
    namespaces: ['*'],
    aggs: {
      spaces: {
        terms: {
          size: MAX_BUCKETS_LIMIT,
          field: `${CASE_SAVED_OBJECT}.namespaces`,
        },
      },
    },
  });

  return response.aggregations?.spaces.buckets.map((space) => space.key) ?? [];
};
