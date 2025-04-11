/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { DegradedFieldResponse } from '../../../../common/api_types';
import { MAX_DEGRADED_FIELDS } from '../../../../common/constants';
import { INDEX, TIMESTAMP, _IGNORED } from '../../../../common/es_fields';
import { createDatasetQualityESClient } from '../../../utils';
import { existsQuery, rangeQuery } from '../../../utils/queries';
import { getFieldIntervalInSeconds } from '../../../utils/get_interval';

export async function getDegradedFields({
  esClient,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  dataStream: string;
}): Promise<DegradedFieldResponse> {
  const fieldInterval = getFieldIntervalInSeconds({ start, end });
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const filterQuery = [...rangeQuery(start, end)];

  const mustQuery = [...existsQuery(_IGNORED)];

  const aggs = {
    degradedFields: {
      terms: {
        size: MAX_DEGRADED_FIELDS,
        field: _IGNORED,
      },
      aggs: {
        lastOccurrence: {
          max: {
            field: TIMESTAMP,
          },
        },
        index: {
          terms: {
            size: 1,
            field: INDEX,
            order: {
              _key: 'desc' as const,
            },
          },
        },
        timeSeries: {
          date_histogram: {
            field: TIMESTAMP,
            fixed_interval: `${fieldInterval}s`,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
        },
      },
    },
  };

  const response = await datasetQualityESClient.search({
    index: dataStream,
    size: 0,
    query: {
      bool: {
        filter: filterQuery,
        must: mustQuery,
      },
    },
    aggs,
  });

  return {
    degradedFields:
      response.aggregations?.degradedFields.buckets.map((bucket) => ({
        name: bucket.key as string,
        count: bucket.doc_count,
        lastOccurrence: bucket.lastOccurrence.value,
        timeSeries: bucket.timeSeries.buckets.map((timeSeriesBucket) => ({
          x: timeSeriesBucket.key,
          y: timeSeriesBucket.doc_count,
        })),
        indexFieldWasLastPresentIn: bucket.index.buckets[0].key as string,
      })) ?? [],
  };
}
