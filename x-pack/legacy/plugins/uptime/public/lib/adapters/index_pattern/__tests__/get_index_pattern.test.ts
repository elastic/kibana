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

  it('returns expected data', async () => {
    expect.assertions(1);
    axiosSpy.mockReturnValue(new Promise(r => r({ data: { foo: 'bar' } })));
    expect(await getIndexPattern()).toEqual({ foo: 'bar' });
  });

  it('returns undefined when there is an error fetching', async () => {
    expect.assertions(1);
    axiosSpy.mockReturnValue(
      new Promise((resolve, reject) => reject('Request timeout, server could not be reached'))
    );
    expect(await getIndexPattern()).toBeUndefined();
  });
});
