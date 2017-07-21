import expect from 'expect.js';
import { formatQuery, parseQuery } from 'ui/parse_query';

describe('Query parsing', function () {
  describe('parseQuery', function () {
    it('should treat an empty string as a match_all', function () {
      expect(parseQuery('')).to.eql({ match_all: {} });
    });

    it('should treat input that does not start with { as a query string', function () {
      expect(parseQuery('foo')).to.eql({ query_string: { query: 'foo' } });
      expect(parseQuery('400')).to.eql({ query_string: { query: '400' } });
      expect(parseQuery('true')).to.eql({ query_string: { query: 'true' } });
    });

    it('should parse valid JSON', function () {
      expect(parseQuery('{}')).to.eql({});
      expect(parseQuery('{a:b}')).to.eql({ query_string: { query: '{a:b}' } });
    });
  });

  describe('formatQuery', function () {
    it('should present undefined as empty string', function () {
      let notDefined;
      expect(formatQuery(notDefined)).to.be('');
    });

    it('should present null as empty string', function () {
      expect(formatQuery(null)).to.be('');
    });

    it('should present objects as strings', function () {
      expect(formatQuery({ foo: 'bar' })).to.be('{"foo":"bar"}');
    });

    it('should present query_string queries as strings', function () {
      expect(formatQuery({ query_string: { query: 'lucene query string' } })).to.be('lucene query string');
    });

    it('should present query_string queries without a query as an empty string', function () {
      expect(formatQuery({ query_string: {} })).to.be('');
    });

    it('should present string as strings', function () {
      expect(formatQuery('foo')).to.be('foo');
    });

    it('should present numbers as strings', function () {
      expect(formatQuery(400)).to.be('400');
    });
  });
});
