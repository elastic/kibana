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

import fetchMock from 'fetch-mock';
import { kfetch } from './index';

jest.mock('../chrome', () => ({
  addBasePath: path => `myBase/${path}`,
}));
jest.mock('../metadata', () => ({
  metadata: {
    version: 'my-version',
  },
}));

describe('kfetch', () => {
  const matcherName = /my\/path/;

  describe('resolves', () => {
    beforeEach(() =>
      fetchMock.get({
        matcher: matcherName,
        response: new Response(JSON.stringify({ foo: 'bar' })),
      }));
    afterEach(() => fetchMock.restore());

    it('should return response', async () => {
      expect(await kfetch({ pathname: 'my/path', query: { a: 'b' } })).toEqual({
        foo: 'bar',
      });
    });

    it('should prepend with basepath by default', async () => {
      await kfetch({ pathname: 'my/path', query: { a: 'b' } });
      expect(fetchMock.lastUrl(matcherName)).toBe('myBase/my/path?a=b');
    });

    it('should not prepend with basepath when disabled', async () => {
      await kfetch(
        {
          pathname: 'my/path',
          query: { a: 'b' },
        },
        {
          prependBasePath: false,
        }
      );

      expect(fetchMock.lastUrl(matcherName)).toBe('my/path?a=b');
    });

    it('should call with default options', async () => {
      await kfetch({ pathname: 'my/path', query: { a: 'b' } });

      expect(fetchMock.lastOptions(matcherName)).toEqual({
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'kbn-version': 'my-version',
        },
      });
    });

    it('should merge headers', async () => {
      await kfetch({
        pathname: 'my/path',
        query: { a: 'b' },
        headers: { myHeader: 'foo' },
      });
      expect(fetchMock.lastOptions(matcherName).headers).toEqual({
        'Content-Type': 'application/json',
        'kbn-version': 'my-version',
        myHeader: 'foo',
      });
    });
  });

  describe('rejects', () => {
    beforeEach(() => {
      fetchMock.get({
        matcher: matcherName,
        response: {
          status: 404,
        },
      });
    });
    afterEach(() => fetchMock.restore());

    it('should throw custom error containing response object', () => {
      return kfetch({
        pathname: 'my/path',
        query: { a: 'b' }
      }).catch(e => {
        expect(e.message).toBe('Not Found');
        expect(e.res.status).toBe(404);
        expect(e.res.url).toBe('myBase/my/path?a=b');
      });
    });
  });
});
