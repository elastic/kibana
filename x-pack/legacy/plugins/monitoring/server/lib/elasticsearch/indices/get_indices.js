/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { ElasticsearchMetric } from '../../metrics';
import { createQuery } from '../../create_query';
import { paginate } from '../../pagination/paginate';
import { getUnassignedShards } from '../shards';
import { sortIndices } from './sort_indices';
import { i18n } from '@kbn/i18n';
import { getIndicesAggs } from './get_indices_aggs';

export function handleResponse(resp, shardStats) {
  return get(resp, 'aggregations.composite_data.buckets', []).map(hit => {
    const index = hit.key.name;

    const shardStatsForIndex = get(shardStats, ['indices', index]);

    let status;
    let statusSort;
    let unassignedShards;
    if (shardStatsForIndex && shardStatsForIndex.status) {
      status = shardStatsForIndex.status;
      unassignedShards = getUnassignedShards(shardStatsForIndex);

      // create a numerical status value for sorting
      if (status === 'green') {
        statusSort = 1;
      } else if (status === 'yellow') {
        statusSort = 2;
      } else {
        statusSort = 3;
      }
    } else {
      status = i18n.translate('xpack.monitoring.es.indices.deletedClosedStatusLabel', {
        defaultMessage: 'Deleted / Closed',
      });
      statusSort = 0;
    }

    return {
      name: index,
      status,
      doc_count: get(hit, 'doc_count.value'),
      data_size: get(hit, 'data_size.value'),
      index_rate: get(hit, 'index_rate.value'),
      search_rate: get(hit, 'search_rate.value'),
      unassigned_shards: unassignedShards,
      status_sort: statusSort,
    };
  });
}

async function getResults(req, params, shardStats) {
  const results = [];
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  results.push(...handleResponse(response, shardStats));

  const after = get(response, 'aggregations.composite_data.after_key');
  if (!after) {
    return results;
  }

  const newParams = set(params, 'body.aggs.composite_data.composite.after', after);
  return [...results, ...(await getResults(req, newParams, shardStats))];
}

export async function getIndices(
  req,
  esIndexPattern,
  showSystemIndices = false,
  shardStats,
  pagination,
  sort,
  queryText
) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getIndices');

  const { min, max } = req.payload.timeRange;
  const config = req.server.config();
  const size = config.get('xpack.monitoring.max_bucket_size');

  const filters = [];
  if (!showSystemIndices) {
    filters.push({
      bool: {
        must_not: [{ prefix: { 'index_stats.index': '.' } }],
      },
    });
  }
  if (queryText && queryText.length) {
    const wildcardQuery = queryText.includes('*') ? queryText : `*${queryText}*`;
    filters.push({
      wildcard: {
        'index_stats.index': {
          value: wildcardQuery,
        },
      },
    });
  }

  const clusterUuid = req.params.clusterUuid;
  const metricFields = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        type: 'index_stats',
        start: min,
        end: max,
        clusterUuid,
        metric: metricFields,
        filters,
      }),
      aggs: {
        composite_data: {
          composite: {
            size,
            sources: [
              {
                name: {
                  terms: {
                    field: 'index_stats.index',
                    order: 'asc',
                  },
                },
              },
            ],
          },
          aggs: getIndicesAggs(),
        },
      },
    },
  };

  const totalIndices = await getResults(req, params, shardStats);
  const totalIndexCount = totalIndices.length;

  // Manually apply pagination/sorting concerns

  // Sorting
  const sortedIndices = sortIndices(totalIndices, sort);

  // Pagination
  const indices = paginate(pagination, sortedIndices);

  return { indices, totalIndexCount };
}
