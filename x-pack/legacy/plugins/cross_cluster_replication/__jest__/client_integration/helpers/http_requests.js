/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = server => {
  const mockResponse = (defaultResponse, response) => [
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ ...defaultResponse, ...response }),
  ];

  const setLoadFollowerIndicesResponse = response => {
    const defaultResponse = { indices: [] };

    server.respondWith(
      'GET',
      'api/cross_cluster_replication/follower_indices',
      mockResponse(defaultResponse, response)
    );
  };

  const setLoadAutoFollowPatternsResponse = response => {
    const defaultResponse = { patterns: [] };

    server.respondWith(
      'GET',
      'api/cross_cluster_replication/auto_follow_patterns',
      mockResponse(defaultResponse, response)
    );
  };

  const setDeleteAutoFollowPatternResponse = response => {
    const defaultResponse = { errors: [], itemsDeleted: [] };

    server.respondWith(
      'DELETE',
      /api\/cross_cluster_replication\/auto_follow_patterns/,
      mockResponse(defaultResponse, response)
    );
  };

  const setAutoFollowStatsResponse = response => {
    const defaultResponse = {
      numberOfFailedFollowIndices: 0,
      numberOfFailedRemoteClusterStateRequests: 0,
      numberOfSuccessfulFollowIndices: 0,
      recentAutoFollowErrors: [],
      autoFollowedClusters: [
        {
          clusterName: 'new-york',
          timeSinceLastCheckMillis: 13746,
          lastSeenMetadataVersion: 22,
        },
      ],
    };

    server.respondWith(
      'GET',
      'api/cross_cluster_replication/stats/auto_follow',
      mockResponse(defaultResponse, response)
    );
  };

  const setLoadRemoteClustersResponse = (response = [], error) => {
    if (error) {
      server.respondWith('GET', '/api/remote_clusters', [
        error.status || 400,
        { 'Content-Type': 'application/json' },
        JSON.stringify(error.body),
      ]);
    } else {
      server.respondWith('GET', '/api/remote_clusters', [
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(response),
      ]);
    }
  };

  const setGetAutoFollowPatternResponse = response => {
    const defaultResponse = {};

    server.respondWith(
      'GET',
      /api\/cross_cluster_replication\/auto_follow_patterns\/.+/,
      mockResponse(defaultResponse, response)
    );
  };

  const setGetClusterIndicesResponse = (response = []) => {
    server.respondWith('GET', '/api/index_management/indices', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setGetFollowerIndexResponse = response => {
    const defaultResponse = {};

    server.respondWith(
      'GET',
      /api\/cross_cluster_replication\/follower_indices\/.+/,
      mockResponse(defaultResponse, response)
    );
  };

  return {
    setLoadFollowerIndicesResponse,
    setLoadAutoFollowPatternsResponse,
    setDeleteAutoFollowPatternResponse,
    setAutoFollowStatsResponse,
    setLoadRemoteClustersResponse,
    setGetAutoFollowPatternResponse,
    setGetClusterIndicesResponse,
    setGetFollowerIndexResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // We make requests to APIs which don't impact the UX, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, '']);

  return {
    server,
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(server),
  };
};
