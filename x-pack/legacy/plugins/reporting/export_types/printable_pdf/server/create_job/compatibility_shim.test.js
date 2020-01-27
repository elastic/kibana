/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { compatibilityShimFactory } from './compatibility_shim';

const createMockServer = () => {
  return {
    expose: jest.fn(), //fool once_per_server
    log: jest.fn(),
  };
};

const createMockLogger = () => ({
  warning: jest.fn(),
  error: jest.fn(),
});

const createMockRequest = () => {
  return {
    getSavedObjectsClient: once(function() {
      return {
        get: jest.fn(),
      };
    }),
  };
};

test(`passes title through if provided`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);
  const title = 'test title';

  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock)(
    { title, relativeUrls: ['/something'] },
    null,
    createMockRequest()
  );

  expect(mockLogger.warning.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`gets the title from the savedObject`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  const title = 'savedTitle';
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title,
    },
  });

  await compatibilityShim(createJobMock)(
    { objectType: 'search', savedObjectId: 'abc' },
    null,
    mockRequest
  );

  expect(mockLogger.warning.mock.calls.length).toBe(2);
  expect(mockLogger.warning.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`passes the objectType and savedObjectId to the savedObjectsClient`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title: '',
    },
  });

  const objectType = 'search';
  const savedObjectId = 'abc';
  await compatibilityShim(createJobMock)({ objectType, savedObjectId }, null, mockRequest);

  expect(mockLogger.warning.mock.calls.length).toBe(2);
  expect(mockLogger.warning.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.warning.mock.calls[1][0]).toEqual(
    'The title has been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  const getMock = mockRequest.getSavedObjectsClient().get.mock;
  expect(getMock.calls.length).toBe(1);
  expect(getMock.calls[0][0]).toBe(objectType);
  expect(getMock.calls[0][1]).toBe(savedObjectId);
});

test(`logs no warnings when title and relativeUrls is passed`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  await compatibilityShim(createJobMock)(
    { title: 'Phenomenal Dashboard', relativeUrls: ['/abc', '/def'] },
    null,
    mockRequest
  );

  expect(mockLogger.warning.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);
});

test(`logs warning if title can not be provided`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  await compatibilityShim(createJobMock)({ relativeUrls: ['/abc'] }, null, mockRequest);

  expect(mockLogger.warning.mock.calls.length).toBe(1);
  expect(mockLogger.warning.mock.calls[0][0]).toEqual(
    `A title parameter should be provided with the job generation request. Please ` +
      `use Kibana to regenerate your POST URL to have a title included in the PDF.`
  );
});

test(`logs deprecations when generating the title/relativeUrl using the savedObject`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title: '',
    },
  });

  await compatibilityShim(createJobMock)(
    { objectType: 'search', savedObjectId: 'abc' },
    null,
    mockRequest
  );

  expect(mockLogger.warning.mock.calls.length).toBe(2);
  expect(mockLogger.warning.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.warning.mock.calls[1][0]).toEqual(
    'The title has been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
});

test(`passes objectType through`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  const objectType = 'foo';
  await compatibilityShim(createJobMock)(
    { title: 'test', relativeUrls: ['/something'], objectType },
    null,
    mockRequest
  );

  expect(mockLogger.warning.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].objectType).toBe(objectType);
});

test(`passes the relativeUrls through`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();

  const relativeUrls = ['/app/kibana#something', '/app/kibana#something-else'];
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrls }, null, null);

  expect(mockLogger.warning.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toBe(relativeUrls);
});

const testSavedObjectRelativeUrl = (objectType, expectedUrl) => {
  test(`generates the saved object relativeUrl for ${objectType}`, async () => {
    const mockLogger = createMockLogger();
    const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);
    const createJobMock = jest.fn();

    await compatibilityShim(createJobMock)(
      { title: 'test', objectType, savedObjectId: 'abc' },
      null,
      null
    );

    expect(mockLogger.warning.mock.calls.length).toBe(1);
    expect(mockLogger.warning.mock.calls[0][0]).toEqual(
      'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
    );
    expect(mockLogger.error.mock.calls.length).toBe(0);

    expect(createJobMock.mock.calls.length).toBe(1);
    expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual([expectedUrl]);
  });
};

testSavedObjectRelativeUrl('search', '/app/kibana#/discover/abc?');
testSavedObjectRelativeUrl('visualization', '/app/kibana#/visualize/edit/abc?');
testSavedObjectRelativeUrl('dashboard', '/app/kibana#/dashboard/abc?');

test(`appends the queryString to the relativeUrl when generating from the savedObject`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);
  const createJobMock = jest.fn();

  await compatibilityShim(createJobMock)(
    { title: 'test', objectType: 'search', savedObjectId: 'abc', queryString: 'foo=bar' },
    null,
    null
  );

  expect(mockLogger.warning.mock.calls.length).toBe(1);
  expect(mockLogger.warning.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual([
    '/app/kibana#/discover/abc?foo=bar',
  ]);
});

test(`throw an Error if the objectType, savedObjectId and relativeUrls are provided`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);
  const createJobMock = jest.fn();

  const promise = compatibilityShim(createJobMock)(
    {
      title: 'test',
      objectType: 'something',
      relativeUrls: ['/something'],
      savedObjectId: 'abc',
    },
    null,
    null
  );

  await expect(promise).rejects.toBeDefined();
});

test(`passes headers and request through`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(createMockServer(), mockLogger);

  const createJobMock = jest.fn();

  const headers = {};
  const request = createMockRequest();

  await compatibilityShim(createJobMock)(
    { title: 'test', relativeUrls: ['/something'] },
    headers,
    request
  );

  expect(mockLogger.warning.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][1]).toBe(headers);
  expect(createJobMock.mock.calls[0][2]).toBe(request);
});
