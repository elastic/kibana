/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { streamPartsToIndexPattern } from '../../../common/utils';
import { DataStreamType } from '../../../common/types';
import { DataStreamDocsStat } from '../../../common/api_types';
import { _IGNORED } from '../../../common/es_fields';
import { getAggregatedDatasetPaginatedResults } from './get_dataset_aggregated_paginated_results';

export async function getDegradedDocsPaginated(options: {
  esClient: ElasticsearchClient;
  types: DataStreamType[];
  datasetQuery?: string;
  start: number;
  end: number;
}): Promise<DataStreamDocsStat[]> {
  const { esClient, types, datasetQuery, start, end } = options;

  const datasetNames = datasetQuery
    ? [datasetQuery]
    : types.map((type) =>
        streamPartsToIndexPattern({
          typePattern: type,
          datasetPattern: '*-*',
        })
      );

  return await getAggregatedDatasetPaginatedResults({
    esClient,
    start,
    end,
    index: datasetNames.join(','),
    query: {
      must: { exists: { field: _IGNORED } },
    },
  });
}
