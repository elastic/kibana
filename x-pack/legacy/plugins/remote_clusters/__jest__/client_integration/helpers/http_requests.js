/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = server => {
  const mockResponse = (defaultResponse, response) => ([
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ ...defaultResponse, ...response }),
  ]);

  const setLoadRemoteClustersResponse = (response) => {
    const defaultResponse = [];

    server.respondWith('GET', '/api/remote_clusters', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response ? response : defaultResponse),
    ]);
  };

  const setDeleteRemoteClusterResponse = (response) => {
    const defaultResponse = {
      itemsDeleted: [],
      errors: [],
    };

    server.respondWith('DELETE', /api\/remote_clusters/,
      mockResponse(defaultResponse, response)
    );
  };

  return {
    setLoadRemoteClustersResponse,
    setDeleteRemoteClusterResponse,
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
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(server)
  };
};
