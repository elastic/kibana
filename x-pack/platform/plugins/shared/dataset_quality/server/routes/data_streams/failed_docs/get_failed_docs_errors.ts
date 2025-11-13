/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AggregationResultOfMap } from '@kbn/es-types';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import { ERROR_MESSAGE, ERROR_TYPE } from '../../../../common/es_fields';
import { createDatasetQualityESClient } from '../../../utils';
import { rangeQuery } from '../../../utils/queries';

const MAX_ERRORS = 100;
const MAX_EXAMPLES_PER_ERROR = 10;

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
    size: 0,
    query: {
      bool,
    },
    aggs: {
      by_error_type: {
        terms: {
          field: ERROR_TYPE,
          size: MAX_ERRORS,
        },
        aggs: {
          example_failure: {
            top_hits: {
              size: MAX_EXAMPLES_PER_ERROR,
              _source: [ERROR_MESSAGE]
            }
          }
        }
      }
    },
  });

  const errors = extractAndDeduplicateValues(response.aggregations?.by_error_type.buckets ?? []);

  return {
    errors,
  };
}

function extractAndDeduplicateValues(
  buckets: ({
      doc_count: number;
      key: string | number;
      key_as_string?: string | undefined;
    } & AggregationResultOfMap<{
      example_failure: {
        top_hits: {
          size: number;
          _source: string[];
        };
      };
    }, unknown>)[]
): Array<{ type: string; message: string }> {
  return buckets.flatMap((bucket) => {
    const type = String(bucket.key);
    const hits = bucket.example_failure?.hits?.hits ?? [];

    const uniqueMessages = new Set(
      hits
        .map((hit) => (hit._source as Record<string, { message?: string }>).error?.message)
        .filter((message): message is string => Boolean(message))
    );

    return Array.from(uniqueMessages, (message) => ({ type, message }));
  });
}
