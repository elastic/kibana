/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('../chrome', () => ({
  addBasePath: (path: string) => `http://localhost/myBase/${path}`,
}));

jest.mock('../metadata', () => ({
  metadata: {
    version: 'my-version',
  },
}));

import fetchMock from 'fetch-mock';
import {
  addInterceptor,
  Interceptor,
  kfetch,
  resetInterceptors,
  withDefaultOptions,
} from './kfetch';
import { KFetchError } from './kfetch_error';

describe('kfetch', () => {
  afterEach(() => {
    fetchMock.restore();
    resetInterceptors();
  });

  it('should use supplied request method', async () => {
    fetchMock.post('*', {});
    await kfetch({ pathname: 'my/path', method: 'POST' });
    expect(fetchMock.lastOptions('*').method).toBe('POST');
  });

  it('should use supplied Content-Type', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', headers: { 'Content-Type': 'CustomContentType' } });
    expect(fetchMock.lastOptions('*').headers).toMatchObject({
      'Content-Type': 'CustomContentType',
    });
  });

  it('should use supplied pathname and querystring', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', query: { a: 'b' } });
    expect(fetchMock.lastUrl('*')).toBe('http://localhost/myBase/my/path?a=b');
  });

  it('should use supplied headers', async () => {
    fetchMock.get('*', {});
    await kfetch({
      pathname: 'my/path',
      headers: { myHeader: 'foo' },
    });

    expect(fetchMock.lastOptions('*').headers).toEqual({
      'Content-Type': 'application/json',
      'kbn-version': 'my-version',
      myHeader: 'foo',
    });
  });

  it('should return response', async () => {
    fetchMock.get('*', { foo: 'bar' });
    expect(await kfetch({ pathname: 'my/path' })).toEqual({
      foo: 'bar',
    });
  });

  it('should prepend url with basepath by default', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path' });
    expect(fetchMock.lastUrl('*')).toBe('http://localhost/myBase/my/path');
  });

  it('should not prepend url with basepath when disabled', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path' }, { prependBasePath: false });
    expect(fetchMock.lastUrl('*')).toBe('my/path');
  });

  it('should make request with defaults', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path' });

    expect(fetchMock.lastOptions('*')).toEqual({
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': 'my-version',
      },
    });
  });

  it('should reject on network error', async () => {
    expect.assertions(1);
    fetchMock.get('*', { throws: new Error('Network issue') });

    try {
      await kfetch({ pathname: 'my/path' });
    } catch (e) {
      expect(e.message).toBe('Network issue');
    }
  });

  describe('when throwing response error (KFetchError)', async () => {
    let error: KFetchError;
    beforeEach(async () => {
      fetchMock.get('*', { status: 404, body: { foo: 'bar' } });
      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should contain error message', () => {
      expect(error.message).toBe('Not Found');
    });

    it('should return response body', () => {
      expect(error.body).toEqual({ foo: 'bar' });
    });

    it('should contain response properties', () => {
      expect(error.res.status).toBe(404);
      expect(error.res.url).toBe('http://localhost/myBase/my/path');
    });
  });

  describe('when all interceptor resolves', () => {
    let resp: any;
    let interceptorCalls: string[];

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      interceptorCalls = mockInterceptorCalls([{}, {}, {}]);
      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should call interceptors in correct order', () => {
      expect(interceptorCalls).toEqual([
        'Request #3',
        'Request #2',
        'Request #1',
        'Response #1',
        'Response #2',
        'Response #3',
      ]);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should return response', () => {
      expect(resp).toEqual({ foo: 'bar' });
    });
  });

  describe('when a request interceptor throws; and the next requestError interceptor resolves', () => {
    let resp: any;
    let interceptorCalls: string[];

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      interceptorCalls = mockInterceptorCalls([
        { requestError: () => ({}) },
        { request: () => Promise.reject(new Error('Error in request')) },
        {},
      ]);

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should call interceptors in correct order', () => {
      expect(interceptorCalls).toEqual([
        'Request #3',
        'Request #2',
        'RequestError #1',
        'Response #1',
        'Response #2',
        'Response #3',
      ]);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should return response', () => {
      expect(resp).toEqual({ foo: 'bar' });
    });
  });

  describe('when a request interceptor throws', () => {
    let error: Error;
    let interceptorCalls: string[];

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      interceptorCalls = mockInterceptorCalls([
        {},
        { request: () => Promise.reject(new Error('Error in request')) },
        {},
      ]);

      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should call interceptors in correct order', () => {
      expect(interceptorCalls).toEqual([
        'Request #3',
        'Request #2',
        'RequestError #1',
        'ResponseError #1',
        'ResponseError #2',
        'ResponseError #3',
      ]);
    });

    it('should not make request', () => {
      expect(fetchMock.called('*')).toBe(false);
    });

    it('should throw error', () => {
      expect(error.message).toEqual('Error in request');
    });
  });

  describe('when a response interceptor throws', () => {
    let error: Error;
    let interceptorCalls: string[];

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      interceptorCalls = mockInterceptorCalls([
        { response: () => Promise.reject(new Error('Error in response')) },
        {},
        {},
      ]);

      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should call in correct order', () => {
      expect(interceptorCalls).toEqual([
        'Request #3',
        'Request #2',
        'Request #1',
        'Response #1',
        'ResponseError #2',
        'ResponseError #3',
      ]);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should throw error', () => {
      expect(error.message).toEqual('Error in response');
    });
  });

  describe('when request interceptor throws; and a responseError interceptor resolves', () => {
    let resp: any;
    let interceptorCalls: string[];

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      interceptorCalls = mockInterceptorCalls([
        {},
        {
          request: () => {
            throw new Error('My request error');
          },
          responseError: () => {
            return { custom: 'response' };
          },
        },
        {},
      ]);

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should call in correct order', () => {
      expect(interceptorCalls).toEqual([
        'Request #3',
        'Request #2',
        'RequestError #1',
        'ResponseError #1',
        'ResponseError #2',
        'Response #3',
      ]);
    });

    it('should not make request', () => {
      expect(fetchMock.called('*')).toBe(false);
    });

    it('should resolve', () => {
      expect(resp).toEqual({ custom: 'response' });
    });
  });

  describe('when interceptors return synchronously', async () => {
    let resp: any;
    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });
      addInterceptor({
        request: config => ({
          ...config,
          addedByRequestInterceptor: true,
        }),
        response: res => ({
          ...res,
          addedByResponseInterceptor: true,
        }),
      });

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should modify request', () => {
      expect(fetchMock.lastOptions('*')).toMatchObject({
        addedByRequestInterceptor: true,
        method: 'GET',
      });
    });

    it('should modify response', () => {
      expect(resp).toEqual({
        addedByResponseInterceptor: true,
        foo: 'bar',
      });
    });
  });

  describe('when interceptors return promise', async () => {
    let resp: any;
    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });
      addInterceptor({
        request: config =>
          Promise.resolve({
            ...config,
            addedByRequestInterceptor: true,
          }),
        response: res =>
          Promise.resolve({
            ...res,
            addedByResponseInterceptor: true,
          }),
      });

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should modify request', () => {
      expect(fetchMock.lastOptions('*')).toMatchObject({
        addedByRequestInterceptor: true,
        method: 'GET',
      });
    });

    it('should modify response', () => {
      expect(resp).toEqual({
        addedByResponseInterceptor: true,
        foo: 'bar',
      });
    });
  });
});

function mockInterceptorCalls(interceptors: Interceptor[]) {
  const interceptorCalls: string[] = [];
  interceptors.forEach((interceptor, i) => {
    addInterceptor({
      request: config => {
        interceptorCalls.push(`Request #${i + 1}`);

        if (interceptor.request) {
          return interceptor.request(config);
        }

        return config;
      },
      requestError: e => {
        interceptorCalls.push(`RequestError #${i + 1}`);
        if (interceptor.requestError) {
          return interceptor.requestError(e);
        }

        throw e;
      },
      response: res => {
        interceptorCalls.push(`Response #${i + 1}`);

        if (interceptor.response) {
          return interceptor.response(res);
        }

        return res;
      },
      responseError: e => {
        interceptorCalls.push(`ResponseError #${i + 1}`);

        if (interceptor.responseError) {
          return interceptor.responseError(e);
        }

        throw e;
      },
    });
  });

  return interceptorCalls;
}

describe('withDefaultOptions', () => {
  it('should remove undefined query params', () => {
    const { query } = withDefaultOptions({
      query: {
        foo: 'bar',
        param1: (undefined as any) as string,
        param2: (null as any) as string,
        param3: '',
      },
    });
    expect(query).toEqual({ foo: 'bar', param2: null, param3: '' });
  });

  it('should add default options', () => {
    expect(withDefaultOptions({})).toEqual({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'kbn-version': 'my-version' },
      method: 'GET',
    });
  });
});
