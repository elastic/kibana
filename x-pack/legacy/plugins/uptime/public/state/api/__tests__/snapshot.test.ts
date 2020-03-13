/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchSnapshotCount } from '../snapshot';
import { apiService } from '../utils';
import { HttpFetchError } from '../../../../../../../../src/core/public/http/http_fetch_error';

describe('snapshot API', () => {
  let fetchMock: jest.SpyInstance<Partial<unknown>>;
  let mockResponse: Partial<unknown>;

  beforeEach(() => {
    apiService.http = {
      get: jest.fn(),
    } as any;
    fetchMock = jest.spyOn(apiService.http, 'get');
    mockResponse = { up: 3, down: 12, total: 15 };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls url with expected params and returns response body on 200', async () => {
    fetchMock.mockReturnValue(new Promise(r => r(mockResponse)));
    const resp = await fetchSnapshotCount({
      basePath: '',
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      filters: 'monitor.id:"auto-http-0X21EE76EAC459873F"',
      statusFilter: 'up',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/uptime/snapshot/count', {
      query: {
        dateRangeEnd: 'now',
        dateRangeStart: 'now-15m',
        filters: 'monitor.id:"auto-http-0X21EE76EAC459873F"',
        statusFilter: 'up',
      },
    });
    expect(resp).toEqual({ up: 3, down: 12, total: 15 });
  });

  it(`throws when server response doesn't correspond to expected type`, async () => {
    mockResponse = { foo: 'bar' };
    fetchMock.mockReturnValue(new Promise(r => r(mockResponse)));
    let error: Error | undefined;
    try {
      await fetchSnapshotCount({
        basePath: '',
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
        filters: 'monitor.id: baz',
        statusFilter: 'up',
      });
    } catch (e) {
      error = e;
    }
    expect(error).toMatchSnapshot();
  });

  it('throws an error when response is not ok', async () => {
    mockResponse = new HttpFetchError('There was an error fetching your data.', 'error', {} as any);
    fetchMock.mockReturnValue(mockResponse);
    let error: Error | undefined;
    try {
      await fetchSnapshotCount({
        basePath: '',
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
      });
    } catch (e) {
      error = e;
    }
    expect(error).toEqual(new Error('There was an error fetching your data.'));
  });
});
