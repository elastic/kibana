/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compatibilityShimFactory } from './compatibility_shim';

const createMockServer = () => {
  const config = {
    'server.host': 'localhost',
    'server.port': '5601',
    'server.basePath': '',
  };

  return {
    info: {
      protocol: 'http'
    },
    expose: jest.fn(), // fools once_per_server
    log: jest.fn(),
    config: () => {
      return {
        get: key => config[key]
      };
    }
  };
};

const getMockExecutedJob = executeJobMock => executeJobMock.mock.calls[0][1];

test(`it throw error if full URL is provided that is not a Kibana URL`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  await expect(compatibilityShim(executeJobMock)('pdfJobToExecuteId', { query: '', objects: [ { url: 'https://localhost/app/kibana' } ] })).rejects.toBeDefined();
});

test(`it passes url through if it is a Kibana URL`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const url = 'http://localhost:5601/app/kibana/#visualize';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { objects: [ { url } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.objects[0].url).toBe(url);
});

test(`it generates the absolute url if a urlHash is provided`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const urlHash = '#visualize';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { objects: [ { urlHash } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.urls[0]).toBe('http://localhost:5601/app/kibana#visualize');
});

test(`it generates the absolute url using server's basePath if a relativeUrl is provided`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const relativeUrl = '/app/kibana#/visualize?';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { objects: [ { relativeUrl } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.urls[0]).toBe('http://localhost:5601/app/kibana#/visualize?');
});

test(`it generates the absolute url using job's basePath if a relativeUrl is provided`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const relativeUrl = '/app/kibana#/visualize?';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { basePath: '/s/marketing', objects: [ { relativeUrl } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.urls[0]).toBe('http://localhost:5601/s/marketing/app/kibana#/visualize?');
});

test(`it generates the absolute url using server's basePath if a relativeUrl with querystring is provided`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const relativeUrl = '/app/kibana?_t=123456789#/visualize?_g=()';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { objects: [ { relativeUrl } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.urls[0]).toBe('http://localhost:5601/app/kibana?_t=123456789#/visualize?_g=()');
});

test(`it generates the absolute url using job's basePath if a relativeUrl with querystring is provided`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const relativeUrl = '/app/kibana?_t=123456789#/visualize?_g=()';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { basePath: '/s/marketing', objects: [ { relativeUrl } ] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.urls[0]).toBe('http://localhost:5601/s/marketing/app/kibana?_t=123456789#/visualize?_g=()');
});

test(`it passes the provided browserTimezone through`, async () => {
  const executeJobMock = jest.fn();
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const browserTimezone = 'UTC';
  await compatibilityShim(executeJobMock)('pdfJobToExecuteId', { browserTimezone, objects: [] });
  expect(executeJobMock.mock.calls.length).toBe(1);
  const executedJob = getMockExecutedJob(executeJobMock);
  expect(executedJob.browserTimezone).toEqual(browserTimezone);
});
