/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createTimeFilter } from '../create_query';
import { detectReason } from './detect_reason';
import { formatUTCTimestampForTimezone } from '../format_timezone';
import { getTimezone } from '../get_timezone';
import { detectReasonFromException } from './detect_reason_from_exception';

async function handleResponse(response, req, filebeatIndexPattern, opts) {
  const result = {
    enabled: false,
    logs: [],
  };

  const timezone = await getTimezone(req);
  const hits = get(response, 'hits.hits', []);
  if (hits.length) {
    result.enabled = true;
    result.logs = hits.map(hit => {
      const source = hit._source;
      const type = get(source, 'event.dataset').split('.')[1];
      const utcTimestamp = moment(get(source, '@timestamp')).valueOf();

      return {
        timestamp: formatUTCTimestampForTimezone(utcTimestamp, timezone),
        component: get(source, 'elasticsearch.component'),
        node: get(source, 'elasticsearch.node.name'),
        index: get(source, 'elasticsearch.index.name'),
        level: get(source, 'log.level'),
        type,
        message: get(source, 'message'),
      };
    });
  } else {
    result.reason = await detectReason(req, filebeatIndexPattern, opts);
  }

  return result;
}

export async function getLogs(
  config,
  req,
  filebeatIndexPattern,
  { clusterUuid, nodeUuid, indexUuid, start, end }
) {
  checkParam(filebeatIndexPattern, 'filebeatIndexPattern in logs/getLogs');

  const metric = { timestampField: '@timestamp' };
  const filter = [
    { term: { 'service.type': 'elasticsearch' } },
    createTimeFilter({ start, end, metric }),
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
    size: Math.min(50, config.get('xpack.monitoring.elasticsearch.logFetchCount')),
    filterPath: [
      'hits.hits._source.message',
      'hits.hits._source.log.level',
      'hits.hits._source.@timestamp',
      'hits.hits._source.event.dataset',
      'hits.hits._source.elasticsearch.component',
      'hits.hits._source.elasticsearch.index.name',
      'hits.hits._source.elasticsearch.node.name',
    ],
    ignoreUnavailable: true,
    body: {
      sort: { '@timestamp': { order: 'desc' } },
      query: {
        bool: {
          filter,
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  let result = {};
  try {
    const response = await callWithRequest(req, 'search', params);
    result = await handleResponse(response, req, filebeatIndexPattern, {
      clusterUuid,
      nodeUuid,
      indexUuid,
      start,
      end,
    });
  } catch (err) {
    result.reason = detectReasonFromException(err);
  }

  return {
    ...result,
    limit: params.size,
  };
}
