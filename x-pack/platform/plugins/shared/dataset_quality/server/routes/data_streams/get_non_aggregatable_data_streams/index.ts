/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { badRequest } from '@hapi/boom';
import { _IGNORED } from '../../../../common/es_fields';
import type { DataStreamType } from '../../../../common/types';
import { createDatasetQualityESClient } from '../../../utils';
import { rangeQuery } from '../../../utils/queries';
import { extractNonAggregatableDatasets } from './extract_non_aggregatable_datasets';

export async function getNonAggregatableDataStreams({
  esClient,
  types = [],
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  types?: DataStreamType[];
  start: number;
  end: number;
  dataStream?: string;
}) {
  if (types.length === 0 && !dataStream) {
    throw badRequest(`Either types or dataStream must be provided.`);
  }

  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const dataStreamTypes = types.map((type) => `${type}-*-*`).join(',');

  try {
    const response = await datasetQualityESClient.fieldCaps({
      index: dataStream ?? dataStreamTypes,
      fields: [_IGNORED],
      index_filter: {
        ...rangeQuery(start, end)[0],
      },
    });

    const indices = response?.indices ?? [];

    // if no indices are returned, it means there are no data streams matching the criteria
    // so we return an empty response - aggregatable is set to true so no error is thrown in the UI
    if (indices.length === 0) {
      return {
        aggregatable: true,
        datasets: [],
      };
    }

    const nonAggregatableIndices =
      response.fields._ignored?._ignored?.non_aggregatable_indices ?? [];

    const datasets = extractNonAggregatableDatasets(indices, nonAggregatableIndices);
    // If there are no non_aggregatable_indices, it means that either all indices are either aggregatable or non-aggregatable
    // so we need to check the aggregatable field to determine
    const aggregatable = response.fields._ignored?._ignored?.non_aggregatable_indices
      ? datasets.length === 0
      : Boolean(response.fields._ignored?._ignored?.aggregatable);

    return {
      aggregatable,
      datasets,
    };
  } catch (error) {
    if (error.message.includes('index_closed_exception')) {
      return {
        aggregatable: true,
        datasets: [],
      };
    }

    throw error;
  }
}
