/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = server => {
  const setIndexPatternValidityResponse = response => {
    const defaultResponse = {
      doesMatchIndices: true,
      doesMatchRollupIndices: false,
      dateFields: ['foo', 'bar'],
      numericFields: [],
      keywordFields: [],
    };
    server.respondWith(/\/api\/rollup\/index_pattern_validity\/.*/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  const setCreateJobResponse = (responsePayload = {}) => {
    server.respondWith(/\/api\/rollup\/create/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(responsePayload),
    ]);
  };

  const setStartJobResponse = () => {
    server.respondWith(/\/api\/rollup\/start/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({}),
    ]);
  };

  const setLoadJobsResponse = response => {
    server.respondWith('GET', '/api/rollup/jobs', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  return {
    setIndexPatternValidityResponse,
    setCreateJobResponse,
    setLoadJobsResponse,
    setStartJobResponse,
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
