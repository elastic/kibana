import expect from 'expect.js';
import * as literal from '../literal';

describe('kuery node types', function () {

  describe('literal', function () {

    describe('buildNode', function () {

      it('should return a node representing the given value', function () {
        const result = literal.buildNode('foo');
        expect(result).to.have.property('type', 'literal');
        expect(result).to.have.property('value', 'foo');
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return the literal value represented by the given node', function () {
        const node = literal.buildNode('foo');
        const result = literal.toElasticsearchQuery(node);
        expect(result).to.be('foo');
      });

    });

    describe('toKueryExpression', function () {

      it('should return the literal value represented by the given node', function () {
        const numberNode = literal.buildNode(200);
        expect(literal.toKueryExpression(numberNode)).to.be(200);
      });

      it('should wrap string values in double quotes', function () {
        const stringNode = literal.buildNode('foo');
        expect(literal.toKueryExpression(stringNode)).to.be('"foo"');
      });

    });

  });

});
