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
  addBasePath: (path: string) => `http://localhost.com/myBase/${path}`,
}));

jest.mock('../metadata', () => ({
  metadata: {
    version: 'my-version',
  },
}));

import fetchMock from 'fetch-mock';
import { addInterceptor, kfetch, resetInterceptors } from './kfetch';
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
    expect(fetchMock.lastUrl('*')).toBe('http://localhost.com/myBase/my/path?a=b');
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
    expect(fetchMock.lastUrl('*')).toBe('http://localhost.com/myBase/my/path');
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
      expect(error.res.url).toBe('http://localhost.com/myBase/my/path');
    });
  });

  describe('when multiple interceptors are added', () => {
    let resp: any;
    let interceptorCalls: string[];

    beforeEach(async () => {
      interceptorCalls = [];
      fetchMock.get('*', { foo: 'bar' });

      addInterceptor({
        request: config => {
          interceptorCalls.push('Request A');
          return config;
        },
        response: res => {
          interceptorCalls.push('Response A');
          return res;
        },
      });
      addInterceptor({
        request: config => {
          interceptorCalls.push('Request B');
          return config;
        },
        response: res => {
          interceptorCalls.push('Response B');
          return res;
        },
      });

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should call request interceptors in correct order', () => {
      expect(interceptorCalls).toEqual(['Request B', 'Request A', 'Response A', 'Response B']);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should return response', () => {
      expect(resp).toEqual({ foo: 'bar' });
    });
  });

  describe('when multiple interceptors are added and the newest request interceptor throws', () => {
    let resp: any;
    let interceptorCalls: string[];

    beforeEach(async () => {
      interceptorCalls = [];
      fetchMock.get('*', { foo: 'bar' });

      addInterceptor({
        request: config => {
          interceptorCalls.push('Request A');
          return config;
        },
        requestError: e => {
          interceptorCalls.push('RequestError A');
          return {};
        },
        response: res => {
          interceptorCalls.push('Response A');
          return res;
        },
        responseError: res => {
          interceptorCalls.push('ResponseError A');
          return res;
        },
      });
      addInterceptor({
        request: config => {
          interceptorCalls.push('Request B');
          throw new Error('Error from Request B');
        },
        requestError: e => {
          interceptorCalls.push('RequestError B');
          throw e;
        },
        response: res => {
          interceptorCalls.push('Response B');
          return res;
        },
        responseError: res => {
          interceptorCalls.push('ResponseError B');
          return res;
        },
      });

      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should call request interceptors in correct order', () => {
      expect(interceptorCalls).toEqual(['Request B', 'RequestError A', 'Response A', 'Response B']);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should return response', () => {
      expect(resp).toEqual({ foo: 'bar' });
    });
  });

  describe('when multiple interceptors are added and the newest response interceptor throws', () => {
    let error: Error;
    let interceptorCalls: string[];

    beforeEach(async () => {
      interceptorCalls = [];
      fetchMock.get('*', { foo: 'bar' });

      addInterceptor({
        request: config => {
          interceptorCalls.push('Request A');
          return config;
        },
        requestError: e => {
          interceptorCalls.push('RequestError A');
          return {};
        },
        response: res => {
          interceptorCalls.push('Response A');
          throw new Error('Thrown in Response A');
        },
        responseError: res => {
          interceptorCalls.push('ResponseError A');
          return res;
        },
      });
      addInterceptor({
        request: config => {
          interceptorCalls.push('Request B');
          return config;
        },
        requestError: e => {
          interceptorCalls.push('RequestError B');
          throw e;
        },
        response: res => {
          interceptorCalls.push('Response B');
          return res;
        },
        responseError: e => {
          interceptorCalls.push('ResponseError B');
          throw e;
        },
      });

      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should call request interceptors in correct order', () => {
      expect(interceptorCalls).toEqual(['Request B', 'Request A', 'Response A', 'ResponseError B']);
    });

    it('should make request', () => {
      expect(fetchMock.called('*')).toBe(true);
    });

    it('should throw error', () => {
      expect(error.message).toEqual('Thrown in Response A');
    });
  });

  describe('when request interceptor reject but responseError interceptor resolves', () => {
    let resp: any;

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      addInterceptor({
        request: config => {
          throw new Error('My request error');
        },
        responseError: res => {
          return { custom: 'response' };
        },
      });

      resp = await kfetch({ pathname: 'my/path' });
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

    it('should modify request', () => {
      expect(resp).toEqual({
        addedByResponseInterceptor: true,
        foo: 'bar',
      });
    });
  });

  describe('when response interceptor throws', () => {
    let error: Error;
    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });
      addInterceptor({
        response: res => {
          throw new Error('custom response error');
        },
      });

      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should return rejected promise', async () => {
      expect(error.message).toBe('custom response error');
    });
  });

  describe('when the first of three response interceptors throws an error', () => {
    let error: Error;
    let spy1: jest.Mock;
    let spy2: jest.Mock;
    let spy3: jest.Mock;

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      spy1 = jest.fn(e => {
        throw new Error('my custom error');
      });

      spy2 = jest.fn();
      spy3 = jest.fn();

      addInterceptor({ response: spy1 });
      addInterceptor({ response: spy2 });
      addInterceptor({ response: spy3 });

      try {
        await kfetch({ pathname: 'my/path' });
      } catch (e) {
        error = e;
      }
    });

    it('should call the first interceptor', () => {
      expect(spy1.mock.calls[0][0]).toEqual({ foo: 'bar' });
    });

    it('should reject with the error from the first interceptor', () => {
      expect(error.message).toBe('my custom error');
    });

    it('should not call subsequent interceptors', () => {
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
    });
  });

  describe('when all response interceptors resolve', async () => {
    let resp: any;
    let spy1: jest.Mock;
    let spy2: jest.Mock;
    let spy3: jest.Mock;

    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });

      spy1 = jest.fn(res => ({ ...res, spy1: true }));
      spy2 = jest.fn(res => ({ ...res, spy2: true }));
      spy3 = jest.fn(res => ({ ...res, spy3: true }));
      addInterceptor({ response: spy1 });
      addInterceptor({ response: spy2 });
      addInterceptor({ response: spy3 });
      resp = await kfetch({ pathname: 'my/path' });
    });

    it('should return the value of the last interceptor', () => {
      expect(resp).toEqual({ foo: 'bar', spy1: true, spy2: true, spy3: true });
    });

    it('should call each interceptors with the value of the preceding interceptor', () => {
      expect(spy1.mock.calls[0][0]).toEqual({ foo: 'bar' });
      expect(spy2.mock.calls[0][0]).toEqual({ foo: 'bar', spy1: true });
      expect(spy3.mock.calls[0][0]).toEqual({ foo: 'bar', spy1: true, spy2: true });
    });
  });
});
