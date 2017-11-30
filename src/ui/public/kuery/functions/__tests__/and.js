import expect from 'expect.js';
import * as and from '../and';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal';

let indexPattern;

const childNode1 = nodeTypes.function.buildNode('is', 'response', 200);
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('and', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('should return "arguments" and "serializeStyle" params', function () {
        const result = and.buildNodeParams([childNode1, childNode2]);
        expect(result).to.only.have.keys('arguments', 'serializeStyle');
      });

      it('arguments should contain the unmodified child nodes', function () {
        const result = and.buildNodeParams([childNode1, childNode2]);
        const { arguments: [ actualChildNode1, actualChildNode2 ] } = result;
        expect(actualChildNode1).to.be(childNode1);
        expect(actualChildNode2).to.be(childNode2);
      });

      it('serializeStyle should default to "operator"', function () {
        const { serializeStyle } = and.buildNodeParams([childNode1, childNode2]);
        expect(serializeStyle).to.be('operator');
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should wrap subqueries in an ES bool query\'s filter clause', function () {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2]);
        const result = and.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.only.have.keys('filter');
        expect(result.bool.filter).to.eql(
          [childNode1, childNode2].map((childNode) => ast.toElasticsearchQuery(childNode, indexPattern))
        );
      });

      it('should wrap a literal argument with an "is" function targeting the default_field', function () {
        const literalFoo = nodeTypes.literal.buildNode('foo');
        const expectedChild = ast.toElasticsearchQuery(nodeTypes.function.buildNode('is', null, 'foo'), indexPattern);
        const node = nodeTypes.function.buildNode('and', [literalFoo]);
        const result = and.toElasticsearchQuery(node, indexPattern);
        const resultChild = result.bool.filter[0];
        expectDeepEqual(resultChild, expectedChild);
      });

    });

    describe('toKueryExpression', function () {

      it('should serialize "and" nodes with an implicit syntax when requested', function () {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2], 'implicit');
        const result = and.toKueryExpression(node);
        expect(result).to.be('"response":200 "extension":"jpg"');
      });

      it('should serialize "and" nodes with an operator syntax when requested', function () {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2], 'operator');
        const result = and.toKueryExpression(node);
        expect(result).to.be('"response":200 and "extension":"jpg"');
      });

      it('should wrap "or" sub-queries in parenthesis', function () {
        const orNode = nodeTypes.function.buildNode('or', [childNode1, childNode2], 'operator');
        const fooBarNode = nodeTypes.function.buildNode('is', 'foo', 'bar');
        const andNode = nodeTypes.function.buildNode('and', [orNode, fooBarNode], 'implicit');

        const result = and.toKueryExpression(andNode);
        expect(result).to.be('("response":200 or "extension":"jpg") "foo":"bar"');
      });

      it('should throw an error for nodes with unknown or undefined serialize styles', function () {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2], 'notValid');
        expect(and.toKueryExpression)
          .withArgs(node).to.throwException(/Cannot serialize "and" function as "notValid"/);
      });

    });
  });
});
