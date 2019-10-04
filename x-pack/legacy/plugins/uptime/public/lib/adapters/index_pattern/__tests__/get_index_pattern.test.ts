/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { getIndexPattern } from '../get_index_pattern';

describe('getIndexPattern', () => {
  let axiosSpy: jest.SpyInstance<Promise<unknown>, [string, (AxiosRequestConfig | undefined)?]>;
  beforeEach(() => {
    axiosSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected data', async () => {
    expect.assertions(3);
    axiosSpy.mockReturnValue(new Promise(r => r({ data: { foo: 'bar' } })));
    expect(await getIndexPattern()).toEqual({ foo: 'bar' });
    expect(axiosSpy.mock.calls).toHaveLength(1);
    expect(axiosSpy.mock.calls[0]).toEqual(['/api/uptime/index_pattern']);
  });

  it('handles the supplied basePath', async () => {
    expect.assertions(2);
    await getIndexPattern('foo');
    expect(axiosSpy.mock.calls).toHaveLength(1);
    expect(axiosSpy.mock.calls[0]).toEqual(['foo/api/uptime/index_pattern']);
  });

  it('supplies the returned data to the given setter function', async () => {
    const mockSetter = jest.fn();
    axiosSpy.mockReturnValue(new Promise(r => r({ data: { foo: 'bar' } })));
    await getIndexPattern(undefined, mockSetter);
    expect(mockSetter).toHaveBeenCalled();
    expect(mockSetter).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('returns undefined when there is an error fetching', async () => {
    expect.assertions(1);
    axiosSpy.mockReturnValue(
      new Promise((resolve, reject) => reject('Request timeout, server could not be reached'))
    );
    expect(await getIndexPattern()).toBeUndefined();
  });
});
