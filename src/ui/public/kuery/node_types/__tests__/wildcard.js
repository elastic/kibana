import expect from 'expect.js';
import * as wildcard from '../wildcard';

describe('kuery node types', function () {

  describe('wildcard', function () {

    describe('buildNode', function () {

      it('should accept a string argument representing a wildcard string', function () {
        const wildcardValue = `foo${wildcard.wildcardSymbol}bar`;
        const result = wildcard.buildNode(wildcardValue);
        expect(result).to.have.property('type', 'wildcard');
        expect(result).to.have.property('value', wildcardValue);
      });

      it('should accept and parse a wildcard string', function () {
        const result = wildcard.buildNode('foo*bar');
        expect(result).to.have.property('type', 'wildcard');
        expect(result.value).to.be(`foo${wildcard.wildcardSymbol}bar`);
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return the string representation of the wildcard literal', function () {
        const node = wildcard.buildNode('foo*bar');
        const result = wildcard.toElasticsearchQuery(node);
        expect(result).to.be('foo*bar');
      });

    });

    describe('toQueryStringQuery', function () {

      it('should return the string representation of the wildcard literal', function () {
        const node = wildcard.buildNode('foo*bar');
        const result = wildcard.toQueryStringQuery(node);
        expect(result).to.be('foo*bar');
      });

      it('should escape query_string query special characters other than wildcard', function () {
        const node = wildcard.buildNode('+foo*bar');
        const result = wildcard.toQueryStringQuery(node);
        expect(result).to.be('\\+foo*bar');
      });

    });

    describe('test', function () {

      it('should return a boolean indicating whether the string matches the given wildcard node', function () {
        const node = wildcard.buildNode('foo*bar');
        expect(wildcard.test(node, 'foobar')).to.be(true);
        expect(wildcard.test(node, 'foobazbar')).to.be(true);
        expect(wildcard.test(node, 'foobar')).to.be(true);

        expect(wildcard.test(node, 'fooqux')).to.be(false);
        expect(wildcard.test(node, 'bazbar')).to.be(false);
      });

    });

  });

});
