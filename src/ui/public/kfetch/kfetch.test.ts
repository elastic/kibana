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

describe('kfetch', () => {
  afterEach(() => {
    fetchMock.restore();
    resetInterceptors();
  });

  it('should change request method', async () => {
    fetchMock.post('*', {});
    await kfetch({ pathname: 'my/path', method: 'POST' });
    expect(fetchMock.lastOptions('*').method).toBe('POST');
  });

  it('should change Content-Type', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', headers: { 'Content-Type': 'CustomContentType' } });
    expect(fetchMock.lastOptions('*').headers).toMatchObject({
      'Content-Type': 'CustomContentType',
    });
  });

  it('should support querystring', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', query: { a: 'b' } });
    expect(fetchMock.lastUrl('*')).toBe('http://localhost.com/myBase/my/path?a=b');
  });

  it('should return response', async () => {
    fetchMock.get('*', { foo: 'bar' });
    expect(await kfetch({ pathname: 'my/path' })).toEqual({
      foo: 'bar',
    });
  });

  it('should prepend with basepath by default', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path' });
    expect(fetchMock.lastUrl('*')).toBe('http://localhost.com/myBase/my/path');
  });

  it('should not prepend with basepath when disabled', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path' }, { prependBasePath: false });
    expect(fetchMock.lastUrl('*')).toBe('my/path');
  });

  it('should call with default options', async () => {
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

  it('should apply supplied headers', async () => {
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

  it('should reject on network error', async () => {
    expect.assertions(1);
    fetchMock.get('*', { throws: new Error('Network issue') });

    try {
      await kfetch({ pathname: 'my/path' });
    } catch (e) {
      expect(e.message).toBe('Network issue');
    }
  });

  it('should throw custom error containing response object', async () => {
    expect.assertions(4);
    fetchMock.get('*', { status: 404, body: { foo: 'bar' } });

    try {
      await kfetch({ pathname: 'my/path' });
    } catch (e) {
      expect(e.message).toBe('Not Found');
      expect(e.res.status).toBe(404);
      expect(e.res.url).toBe('http://localhost.com/myBase/my/path');
      expect(e.body).toEqual({ foo: 'bar' });
    }
  });

  describe('interceptors', () => {
    describe('request', () => {
      it('should add headers via interceptor', async () => {
        fetchMock.get('*', {});
        addInterceptor({
          request: config => {
            return {
              ...config,
              headers: {
                ...config.headers,
                addedByInterceptor: true,
              },
            };
          },
        });

        await kfetch({
          pathname: 'my/path',
          headers: { myHeader: 'foo' },
        });

        expect(fetchMock.lastOptions('*')).toEqual({
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            addedByInterceptor: true,
            myHeader: 'foo',
            'Content-Type': 'application/json',
            'kbn-version': 'my-version',
          },
        });
      });
    });

    describe('requestError', () => {
      it('should throw custom error', async () => {
        expect.assertions(1);
        fetchMock.get('*', { throws: new Error('Network issue') });
        addInterceptor({
          requestError: e => {
            throw new Error(`${e.message} intercepted`);
          },
        });

        try {
          await kfetch({ pathname: 'my/path' });
        } catch (e) {
          expect(e.message).toBe('Network issue intercepted');
        }
      });

      it('should swallow error', async () => {
        fetchMock.get('*', { throws: new Error('Network issue') });
        addInterceptor({
          requestError: e => 'resolved value',
        });

        const resp = await kfetch({ pathname: 'my/path' });
        expect(resp).toBe('resolved value');
      });
    });

    describe('response', () => {
      it('should modify response via interceptor', async () => {
        fetchMock.get('*', { foo: 'bar' });
        addInterceptor({
          response: res => {
            return {
              ...res,
              addedByInterceptor: true,
            };
          },
        });

        const resp = await kfetch({ pathname: 'my/path' });
        expect(resp).toEqual({
          addedByInterceptor: true,
          foo: 'bar',
        });
      });

      it('should modify response via promise interceptor', async () => {
        fetchMock.get('*', { foo: 'bar' });
        addInterceptor({
          response: res => {
            return Promise.resolve({
              ...res,
              addedByInterceptor: true,
            });
          },
        });

        const resp = await kfetch({ pathname: 'my/path' });
        expect(resp).toEqual({
          addedByInterceptor: true,
          foo: 'bar',
        });
      });

      it('should throw via interceptor', async () => {
        expect.assertions(1);
        fetchMock.get('*', { foo: 'bar' });
        addInterceptor({
          response: res => {
            throw new Error('custom response error');
          },
        });

        return kfetch({ pathname: 'my/path' }).catch(e => {
          expect(e.message).toBe('custom response error');
        });
      });
    });

    describe('responseError', () => {
      it('should throw custom error', async () => {
        expect.assertions(1);
        fetchMock.get('*', { status: 404 });

        addInterceptor({
          responseError: e => {
            throw new Error('my custom error');
          },
        });

        try {
          await kfetch({ pathname: 'my/path' });
        } catch (e) {
          expect(e.message).toBe('my custom error');
        }
      });

      it('should return rejected promise', async () => {
        expect.assertions(1);
        fetchMock.get('*', { status: 404 });
        addInterceptor({
          responseError: e => Promise.reject(new Error('my rejected value')),
        });

        try {
          await kfetch({ pathname: 'my/path' });
        } catch (e) {
          expect(e.message).toBe('my rejected value');
        }
      });

      it('should swallow error', async () => {
        fetchMock.get('*', { status: 404 });
        addInterceptor({
          responseError: () => 'resolved valued',
        });

        const resp = await kfetch({ pathname: 'my/path' });
        expect(resp).toBe('resolved valued');
      });
    });

    describe('multiple interceptors', () => {
      it('should throw last error', async () => {
        expect.assertions(4);
        fetchMock.get('*', { status: 404 });

        const spy1 = jest.fn(e => {
          throw new Error('my custom error');
        });

        const spy2 = jest.fn(e => {
          throw new Error('Another error was thrown!');
        });

        const spy3 = jest.fn(e => {
          throw new Error('The very last error');
        });

        addInterceptor({ responseError: spy1 });
        addInterceptor({ responseError: spy2 });
        addInterceptor({ responseError: spy3 });

        try {
          await kfetch({ pathname: 'my/path' });
        } catch (e) {
          expect(spy1.mock.calls[0][0].message).toBe('Not Found');
          expect(spy2.mock.calls[0][0].message).toBe('my custom error');
          expect(spy3.mock.calls[0][0].message).toBe('Another error was thrown!');
          expect(e.message).toBe('The very last error');
        }
      });
    });
  });
});
