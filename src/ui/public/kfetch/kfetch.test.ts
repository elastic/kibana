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
import { _resetInterceptors, interceptors, kfetch } from './kfetch';

describe('kfetch', () => {
  afterEach(() => {
    fetchMock.restore();
    _resetInterceptors();
  });

  it('should change request method', async () => {
    fetchMock.post('*', {});
    await kfetch({ pathname: 'my/path', method: 'POST' });
    expect(fetchMock.lastOptions('*').method).toBe('POST');
  });

  it('should change Content-Type', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', headers: { 'Content-Type': 'CustomContentType' } });
    expect((fetchMock.lastOptions('*').headers as any)['Content-Type']).toBe('CustomContentType');
  });

  it('should return response', async () => {
    fetchMock.get('*', { foo: 'bar' });
    expect(await kfetch({ pathname: 'my/path' })).toEqual({
      foo: 'bar',
    });
  });

  it('should prepend with basepath by default', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', query: { a: 'b' } });
    expect(fetchMock.lastUrl('*')).toBe('http://localhost.com/myBase/my/path?a=b');
  });

  it('should not prepend with basepath when disabled', async () => {
    fetchMock.get('*', {});
    await kfetch({ pathname: 'my/path', query: { a: 'b' } }, { prependBasePath: false });
    expect(fetchMock.lastUrl('*')).toBe('my/path?a=b');
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
    fetchMock.get('*', { throws: new Error('Network issue') });
    expect(kfetch({ pathname: 'my/path' })).rejects.toThrowError('Network issue');
  });

  it('should throw custom error containing response object', async () => {
    expect.assertions(3);
    fetchMock.get('*', { status: 404 });

    try {
      await kfetch({ pathname: 'my/path' });
    } catch (e) {
      expect(e.message).toBe('Not Found');
      expect(e.res.status).toBe(404);
      expect(e.res.url).toBe('http://localhost.com/myBase/my/path');
    }
  });

  describe('interceptors', () => {
    describe('request', () => {
      it('should add headers via interceptor', async () => {
        fetchMock.get('*', {});
        interceptors.push({
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
      it('should throw custom error', () => {
        fetchMock.get('*', { throws: new Error('Network issue') });
        interceptors.push({
          requestError: e => {
            throw new Error(`${e.message} intercepted`);
          },
        });

        const resp = kfetch({ pathname: 'my/path' });
        expect(resp).rejects.toThrowError('Network issue intercepted');
      });

      it('should swallow error', () => {
        fetchMock.get('*', { throws: new Error('Network issue') });
        interceptors.push({
          requestError: e => 'resolved value',
        });

        const resp = kfetch({ pathname: 'my/path' });
        expect(resp).resolves.toBe('resolved value');
      });
    });

    describe('response', () => {
      it('should modify response via interceptor', async () => {
        fetchMock.get('*', { foo: 'bar' });
        interceptors.push({
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
        interceptors.push({
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
        interceptors.push({
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
      it('should throw custom error', () => {
        fetchMock.get('*', { status: 404 });

        interceptors.push({
          responseError: e => {
            throw new Error('my custom error');
          },
        });

        const resp = kfetch({ pathname: 'my/path' });
        expect(resp).rejects.toThrow('my custom error');
      });

      it('should swallow error', () => {
        fetchMock.get('*', { status: 404 });
        interceptors.push({
          responseError: () => 'resolved valued',
        });

        const resp = kfetch({ pathname: 'my/path' });
        expect(resp).resolves.toBe('resolved valued');
      });
    });
  });
});
