/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { API_BASE_PATH } from '../../../common/constants';

type HttpResponse = Record<string, any> | any[];

const mockResponse = (defaultResponse: HttpResponse, response: HttpResponse) => [
  200,
  { 'Content-Type': 'application/json' },
  JSON.stringify({ ...defaultResponse, ...response }),
];

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadRepositoriesResponse = (response: HttpResponse = {}) => {
    const defaultResponse = { repositories: [] };

    server.respondWith(
      'GET',
      `${API_BASE_PATH}repositories`,
      mockResponse(defaultResponse, response)
    );
  };

  const setLoadRepositoryTypesResponse = (response: HttpResponse = []) => {
    server.respondWith('GET', `${API_BASE_PATH}repository_types`, JSON.stringify(response));
  };

  const setGetRepositoryResponse = (response?: HttpResponse) => {
    const defaultResponse = {};

    server.respondWith(
      'GET',
      /api\/snapshot_restore\/repositories\/.+/,
      response
        ? mockResponse(defaultResponse, response)
        : [200, { 'Content-Type': 'application/json' }, '']
    );
  };

  const setSaveRepositoryResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('PUT', `${API_BASE_PATH}repositories`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  const setLoadSnapshotsResponse = (response: HttpResponse = {}) => {
    const defaultResponse = { errors: {}, snapshots: [], repositories: [] };

    server.respondWith('GET', `${API_BASE_PATH}snapshots`, mockResponse(defaultResponse, response));
  };

  const setGetSnapshotResponse = (response?: HttpResponse) => {
    const defaultResponse = {};

    server.respondWith(
      'GET',
      /\/api\/snapshot_restore\/snapshots\/.+/,
      response
        ? mockResponse(defaultResponse, response)
        : [200, { 'Content-Type': 'application/json' }, '']
    );
  };

  const setLoadIndicesResponse = (response: HttpResponse = {}) => {
    const defaultResponse = { indices: [] };

    server.respondWith(
      'GET',
      `${API_BASE_PATH}policies/indices`,
      response
        ? mockResponse(defaultResponse, response)
        : [200, { 'Content-Type': 'application/json' }, '']
    );
  };

  const setAddPolicyResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('PUT', `${API_BASE_PATH}policies`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  const setCleanupRepositoryResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 503 : 200;

    server.respondWith('POST', `${API_BASE_PATH}repositories/:name/cleanup`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setGetPolicyResponse = (response?: HttpResponse) => {
    server.respondWith('GET', `${API_BASE_PATH}policy/:name`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  return {
    setLoadRepositoriesResponse,
    setLoadRepositoryTypesResponse,
    setGetRepositoryResponse,
    setSaveRepositoryResponse,
    setLoadSnapshotsResponse,
    setGetSnapshotResponse,
    setLoadIndicesResponse,
    setAddPolicyResponse,
    setGetPolicyResponse,
    setCleanupRepositoryResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
