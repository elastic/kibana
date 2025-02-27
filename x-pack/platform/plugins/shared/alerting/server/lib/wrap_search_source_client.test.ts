/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of, throwError } from 'rxjs';
import { wrapSearchSourceClient } from './wrap_search_source_client';

let logger: ReturnType<typeof loggingSystemMock.createLogger>;

const rule = {
  name: 'test-rule',
  alertTypeId: '.test-rule-type',
  id: 'abcdefg',
  spaceId: 'my-space',
};

const createSearchSourceClientMock = () => {
  const searchSourceMock = createSearchSourceMock();
  searchSourceMock.fetch$ = jest.fn().mockImplementation(() => of({ rawResponse: { took: 5 } }));

  return {
    searchSourceMock,
    searchSourceClientMock: {
      create: jest.fn().mockReturnValue(searchSourceMock),
      createEmpty: jest.fn().mockReturnValue(searchSourceMock),
    } as unknown as ISearchStartSearchSource,
  };
};

describe('wrapSearchSourceClient', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('searches with provided abort controller', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();

    const { searchSourceClient } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await searchSourceClient.createEmpty();
    await wrappedSearchSource.fetch();

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
    });
  });

  test('searches with provided request timeout', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();

    const { searchSourceClient } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
      requestTimeout: 5000,
    });
    const wrappedSearchSource = await searchSourceClient.createEmpty();
    await wrappedSearchSource.fetch();

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
      transport: {
        requestTimeout: 5000,
      },
    });
    expect(loggingSystemMock.collect(logger).debug.map((params) => params[0])).toContain(
      `executing query for rule .test-rule-type:abcdefg in space my-space - with options {} and 5000ms requestTimeout`
    );
  });

  test('uses search options when specified', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();

    const { searchSourceClient } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
      requestTimeout: 5000,
    });
    const wrappedSearchSource = await searchSourceClient.create();
    await wrappedSearchSource.fetch({ isStored: true, transport: { requestTimeout: 10000 } });

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      isStored: true,
      abortSignal: abortController.signal,
      transport: { requestTimeout: 5000 },
    });
  });

  test('keeps track of number of queries', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();
    searchSourceMock.fetch$ = jest
      .fn()
      .mockImplementation(() => of({ rawResponse: { took: 333 } }));

    const { searchSourceClient, getMetrics } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await searchSourceClient.create();
    await wrappedSearchSource.fetch();
    await wrappedSearchSource.fetch();
    await wrappedSearchSource.fetch();

    expect(searchSourceMock.fetch$).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
    });

    const stats = getMetrics();
    expect(stats.numSearches).toEqual(3);
    expect(stats.esSearchDurationMs).toEqual(999);

    expect(loggingSystemMock.collect(logger).debug.map((params) => params[0])).toContain(
      `executing query for rule .test-rule-type:abcdefg in space my-space - with options {}`
    );
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();
    searchSourceMock.fetch$ = jest
      .fn()
      .mockReturnValue(throwError(new Error('something went wrong!')));

    const { searchSourceClient } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await searchSourceClient.create();
    const fetch = wrappedSearchSource.fetch();

    await expect(fetch).rejects.toThrowErrorMatchingInlineSnapshot('"something went wrong!"');
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const { searchSourceMock, searchSourceClientMock } = createSearchSourceClientMock();
    searchSourceMock.fetch$ = jest
      .fn()
      .mockReturnValue(throwError(new Error('Request has been aborted by the user')));

    const { searchSourceClient } = wrapSearchSourceClient({
      logger,
      rule,
      searchSourceClient: searchSourceClientMock,
      abortController,
    });
    const wrappedSearchSource = await searchSourceClient.create();
    const fetch = wrappedSearchSource.fetch();

    await expect(fetch).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Search has been aborted due to cancelled execution"'
    );
  });
});
