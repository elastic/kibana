/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { get, set, isEqual } from 'lodash';
import { checkParam } from '../../../error_missing_required';
import { createQuery } from '../../../create_query';
import { ElasticsearchMetric } from '../../../metrics';
import { getNodesAggs } from './get_nodes_aggs';
import { sortNodes } from './sort_nodes';
import { paginate } from '../../../pagination/paginate';
import { mapNodesInfo } from './map_nodes_info';

async function getResults(req, params, clusterStats, shardStats) {
  const results = [];
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  const buckets = get(response, 'aggregations.composite_data.buckets', []);
  results.push(...mapNodesInfo(buckets, clusterStats, shardStats));

  const after = get(response, 'aggregations.composite_data.after_key');
  const last = get(buckets[buckets.length - 1], 'key');
  if (!after || isEqual(after, last)) {
    return results;
  }

  const newParams = set(params, 'body.aggs.composite_data.composite.after', after);
  return [...results, ...(await getResults(req, newParams, shardStats))];
}

export async function getNodes(
  req,
  esIndexPattern,
  clusterUuid,
  pagination,
  sort,
  queryText,
  { clusterStats, shardStats }
) {
  checkParam(esIndexPattern, 'esIndexPattern in getNodes');

  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const config = req.server.config();
  const metricFields = ElasticsearchMetric.getMetricFields();

  const size = config.get('xpack.monitoring.max_bucket_size');

  const filters = [];
  if (queryText && queryText.length) {
    const wildcardQuery = queryText.includes('*') ? queryText : `*${queryText}*`;
    filters.push({
      wildcard: {
        'source_node.name': {
          value: wildcardQuery,
        },
      },
    });
  }

  const params = {
    index: esIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        type: 'node_stats',
        start,
        end,
        clusterUuid,
        filters,
        metric: metricFields,
      }),
      aggs: {
        composite_data: {
          composite: {
            size,
            sources: [
              {
                name: {
                  terms: {
                    field: 'source_node.name',
                    order: 'asc',
                  },
                },
              },
            ],
          },
          aggs: getNodesAggs(),
        },
      },
    },
  };

  const totalNodes = await getResults(req, params, clusterStats, shardStats);
  const totalNodeCount = totalNodes.length;

  // Manually apply pagination/sorting concerns

  // Sorting
  const sortedNodes = sortNodes(totalNodes, sort);

  // Pagination
  const nodes = paginate(pagination, sortedNodes);

  return { nodes, totalNodeCount };
}
