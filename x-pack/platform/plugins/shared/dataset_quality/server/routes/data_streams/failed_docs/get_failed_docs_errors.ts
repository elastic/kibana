/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SearchHit } from '@kbn/es-types';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import { TIMESTAMP } from '../../../../common/es_fields';
import { createDatasetQualityESClient } from '../../../utils';
import { rangeQuery } from '../../../utils/queries';

export async function getFailedDocsErrors({
  esClient,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  dataStream: string;
}): Promise<{ errors: Array<{ type: string; message: string }> }> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const bool = {
    filter: [...rangeQuery(start, end)],
  };

  const response = await datasetQualityESClient.search({
    index: `${dataStream}${FAILURE_STORE_SELECTOR}`,
    size: 10000,
    query: {
      bool,
    },
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc',
        },
      },
    ],
  });

  const errors = extractAndDeduplicateValues(response.hits.hits);

  return {
    errors,
  };
}

function extractAndDeduplicateValues(
  searchHits: SearchHit[]
): Array<{ type: string; message: string }> {
  const values: Record<string, Set<string>> = {};

  searchHits.forEach((hit: any) => {
    const fieldKey = hit._source?.error?.type;
    const fieldValue = hit._source?.error?.message;
    if (!values[fieldKey]) {
      // Here we will create a set if not already present
      values[fieldKey] = new Set();
    }
    // here set.add will take care of dedupe
    values[fieldKey].add(fieldValue);
  });

  return Object.entries(values).flatMap(([key, messages]) =>
    Array.from(messages).map((message) => ({ type: key, message }))
  );
}
