/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createTimeFilter } from '../create_query';
import { detectReason } from './detect_reason';
import { detectReasonFromException } from './detect_reason_from_exception';

async function handleResponse(response, req, filebeatIndexPattern, opts) {
  const result = {
    enabled: false,
    types: []
  };

  const typeBuckets = get(response, 'aggregations.types.buckets', []);
  if (typeBuckets.length) {
    result.enabled = true;
    result.types = typeBuckets.map(typeBucket => {
      return {
        type: typeBucket.key.split('.')[1],
        levels: typeBucket.levels.buckets.map(levelBucket => {
          return {
            level: levelBucket.key.toLowerCase(),
            count: levelBucket.doc_count
          };
        })
      };
    });
  }
  else {
    result.reason = await detectReason(req, filebeatIndexPattern, opts);
  }

  return result;
}

export async function getLogTypes(req, filebeatIndexPattern, { clusterUuid, nodeUuid, indexUuid, start, end }) {
  checkParam(filebeatIndexPattern, 'filebeatIndexPattern in logs/getLogTypes');

  const metric = { timestampField: '@timestamp' };
  const filter = [
    { term: { 'service.type': 'elasticsearch' } },
    createTimeFilter({ start, end, metric })
  ];
  if (clusterUuid) {
    filter.push({ term: { 'elasticsearch.cluster.uuid': clusterUuid } });
  }
  if (nodeUuid) {
    filter.push({ term: { 'elasticsearch.node.id': nodeUuid } });
  }
  if (indexUuid) {
    filter.push({ term: { 'elasticsearch.index.name': indexUuid } });
  }

  const params = {
    index: filebeatIndexPattern,
    size: 0,
    filterPath: [
      'aggregations.levels.buckets',
      'aggregations.types.buckets',
    ],
    ignoreUnavailable: true,
    body: {
      sort: { '@timestamp': { order: 'desc' } },
      query: {
        bool: {
          filter,
        }
      },
      aggs: {
        types: {
          terms: {
            field: 'event.dataset'
          },
          aggs: {
            levels: {
              terms: {
                field: 'log.level'
              }
            },
          }
        }
      }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  let result = {};
  try {
    const response = await callWithRequest(req, 'search', params);
    result = await handleResponse(response, req, filebeatIndexPattern, { clusterUuid, nodeUuid, indexUuid, start, end });
  }
  catch (err) {
    result.reason = detectReasonFromException(err);
  }
  return result;
}
