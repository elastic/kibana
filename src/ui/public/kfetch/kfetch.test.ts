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

  describe('when throwing KFetchError response error', async () => {
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

    it('should contain response headers', () => {
      expect(error.res.status).toBe(404);
      expect(error.res.url).toBe('http://localhost.com/myBase/my/path');
    });
  });

  describe('interceptors', () => {
    describe('request', () => {
      it('should add headers and return synchronously', async () => {
        fetchMock.get('*', {});
        addInterceptor({
          request: config => ({
            ...config,
            headers: {
              ...config.headers,
              addedByInterceptor: true,
            },
          }),
        });

        await kfetch({ pathname: 'my/path', headers: { myHeader: 'foo' } });

        expect(fetchMock.lastOptions('*').headers).toEqual({
          addedByInterceptor: true,
          myHeader: 'foo',
          'Content-Type': 'application/json',
          'kbn-version': 'my-version',
        });
      });

      it('should add headers and return promise', async () => {
        fetchMock.get('*', {});
        addInterceptor({
          request: config =>
            Promise.resolve({
              ...config,
              headers: {
                ...config.headers,
                addedByInterceptor: true,
              },
            }),
        });

        await kfetch({ pathname: 'my/path', headers: { myHeader: 'foo' } });

        expect(fetchMock.lastOptions('*').headers).toEqual({
          addedByInterceptor: true,
          myHeader: 'foo',
          'Content-Type': 'application/json',
          'kbn-version': 'my-version',
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

      it('should return rejected promise', async () => {
        expect.assertions(1);
        fetchMock.get('*', { throws: new Error('Network issue') });
        addInterceptor({
          requestError: e => Promise.reject(new Error(`${e.message} intercepted`)),
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
      it('should modify response and return synchronously', async () => {
        fetchMock.get('*', { foo: 'bar' });
        addInterceptor({
          response: res => ({
            ...res,
            addedByInterceptor: true,
          }),
        });

        const resp = await kfetch({ pathname: 'my/path' });
        expect(resp).toEqual({
          addedByInterceptor: true,
          foo: 'bar',
        });
      });

      it('should modify response and return promise', async () => {
        fetchMock.get('*', { foo: 'bar' });
        addInterceptor({
          response: res =>
            Promise.resolve({
              ...res,
              addedByInterceptor: true,
            }),
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

        try {
          await kfetch({ pathname: 'my/path' });
        } catch (e) {
          expect(e.message).toBe('custom response error');
        }
      });

      describe('when the first interceptor throws an error', () => {
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

      describe('when no interceptors throw', async () => {
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

      describe('when every interceptor re-throws the error', async () => {
        let error: Error;
        let spy1: jest.Mock;
        let spy2: jest.Mock;
        let spy3: jest.Mock;

        beforeEach(async () => {
          fetchMock.get('*', { status: 404 });

          spy1 = jest.fn(e => {
            throw new Error('Error from first interceptor');
          });
          spy2 = jest.fn(e => {
            throw new Error('Error from second interceptor');
          });
          spy3 = jest.fn(e => {
            throw new Error('Error from the last interceptor');
          });

          addInterceptor({ responseError: spy1 });
          addInterceptor({ responseError: spy2 });
          addInterceptor({ responseError: spy3 });

          try {
            await kfetch({ pathname: 'my/path' });
          } catch (e) {
            error = e;
          }
        });

        it('should reject with the error from the last interceptor', () => {
          expect(error.message).toBe('Error from the last interceptor');
        });

        it('should call every interceptor with the error of the preceding interceptor', () => {
          expect(spy1.mock.calls[0][0].message).toBe('Not Found');
          expect(spy2.mock.calls[0][0].message).toBe('Error from first interceptor');
          expect(spy3.mock.calls[0][0].message).toBe('Error from second interceptor');
        });
      });

      describe('when the first interceptor swallows the error', async () => {
        let resp: any;
        let spy1: jest.Mock;
        let spy2: jest.Mock;
        let spy3: jest.Mock;

        beforeEach(async () => {
          fetchMock.get('*', { status: 404 });

          spy1 = jest.fn(e => 'my resolved value');
          spy2 = jest.fn();
          spy3 = jest.fn();

          addInterceptor({ responseError: spy1 });
          addInterceptor({ responseError: spy2 });
          addInterceptor({ responseError: spy3 });

          resp = await kfetch({ pathname: 'my/path' });
        });

        it('should call the first interceptor', () => {
          expect(spy1.mock.calls[0][0].message).toBe('Not Found');
        });

        it('should resolve with the value of the first interceptor', () => {
          expect(resp).toBe('my resolved value');
        });

        it('should not call subsequent interceptors', () => {
          expect(spy2).not.toHaveBeenCalled();
          expect(spy3).not.toHaveBeenCalled();
        });
      });
    });
  });
});
