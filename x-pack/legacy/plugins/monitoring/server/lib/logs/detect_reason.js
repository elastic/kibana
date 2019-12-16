/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTimeFilter } from '../create_query';
import { get } from 'lodash';

async function doesFilebeatIndexExist(
  req,
  filebeatIndexPattern,
  { start, end, clusterUuid, nodeUuid, indexUuid }
) {
  const metric = { timestampField: '@timestamp' };
  const filter = [createTimeFilter({ start, end, metric })];

  const typeFilter = { term: { 'service.type': 'elasticsearch' } };
  const clusterFilter = { term: { 'elasticsearch.cluster.uuid': clusterUuid } };
  const nodeFilter = { term: { 'elasticsearch.node.id': nodeUuid } };
  const indexFilter = { term: { 'elasticsearch.index.name': indexUuid } };

  const indexPatternExistsQuery = {
    query: {
      bool: {
        filter,
      },
    },
  };

  const typeExistsAtAnyTimeQuery = {
    query: {
      bool: {
        filter: [typeFilter],
      },
    },
  };

  const typeExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter],
      },
    },
  };

  const clusterExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter],
      },
    },
  };

  const nodeExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter, nodeFilter],
      },
    },
  };

  const indexExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter, indexFilter],
      },
    },
  };

  const defaultParams = {
    size: 0,
  };

  const body = [
    { index: filebeatIndexPattern },
    { ...defaultParams },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...indexPatternExistsQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...typeExistsAtAnyTimeQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...typeExistsQuery },
  ];

  if (clusterUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...clusterExistsQuery }]);
  }

  if (nodeUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...nodeExistsQuery }]);
  }

  if (indexUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...indexExistsQuery }]);
  }

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const {
    responses: [
      indexPatternExistsResponse,
      indexPatternExistsInTimeRangeResponse,
      typeExistsAtAnyTimeResponse,
      typeExistsResponse,
      clusterExistsResponse,
      nodeExistsResponse,
      indexExistsResponse,
    ],
  } = await callWithRequest(req, 'msearch', { body });

  return {
    indexPatternExists: get(indexPatternExistsResponse, 'hits.total.value', 0) > 0,
    indexPatternInTimeRangeExists:
      get(indexPatternExistsInTimeRangeResponse, 'hits.total.value', 0) > 0,
    typeExistsAtAnyTime: get(typeExistsAtAnyTimeResponse, 'hits.total.value', 0) > 0,
    typeExists: get(typeExistsResponse, 'hits.total.value', 0) > 0,
    clusterExists: clusterUuid ? get(clusterExistsResponse, 'hits.total.value', 0) > 0 : null,
    nodeExists: nodeUuid ? get(nodeExistsResponse, 'hits.total.value', 0) > 0 : null,
    indexExists: indexUuid ? get(indexExistsResponse, 'hits.total.value', 0) > 0 : null,
  };
}

export async function detectReason(req, filebeatIndexPattern, opts) {
  return await doesFilebeatIndexExist(req, filebeatIndexPattern, opts);
}
