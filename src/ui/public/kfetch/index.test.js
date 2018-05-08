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
      await kfetch({
        pathname: 'my/path',
        query: { a: 'b' },
        prependBasePath: false,
      });

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
        query: { a: 'b' },
        prependBasePath: false,
      }).catch(e => {
        expect(e.message).toBe('Not Found');
        expect(e.res.status).toBe(404);
        expect(e.res.url).toBe('my/path?a=b');
      });
    });
  });
});
