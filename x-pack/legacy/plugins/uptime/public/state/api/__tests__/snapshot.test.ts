/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchSnapshotCount } from '../snapshot';

describe('snapshot API', () => {
  let fetchMock: jest.SpyInstance<Promise<Partial<Response>>>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    fetchMock = jest.spyOn(window, 'fetch');
    mockResponse = {
      ok: true,
      json: () => new Promise(r => r({ up: 3, down: 12, mixed: 0, total: 15 })),
    };
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
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/uptime/snapshot/count?dateRangeStart=now-15m&dateRangeEnd=now&filters=monitor.id%3A%22auto-http-0X21EE76EAC459873F%22&statusFilter=up'
    );
    expect(resp).toEqual({ up: 3, down: 12, mixed: 0, total: 15 });
  });

  it(`throws when server response doesn't correspond to expected type`, async () => {
    mockResponse = { ok: true, json: () => new Promise(r => r({ foo: 'bar' })) };
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
    mockResponse = { ok: false, statusText: 'There was an error fetching your data.' };
    fetchMock.mockReturnValue(new Promise(r => r(mockResponse)));
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
