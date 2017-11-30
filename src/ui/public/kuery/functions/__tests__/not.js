import expect from 'expect.js';
import * as not from '../not';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal';

let indexPattern;

const childNode = nodeTypes.function.buildNode('is', 'response', 200);

describe('kuery functions', function () {

  describe('not', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('should return "arguments" and "serializeStyle" params', function () {
        const result = not.buildNodeParams(childNode);
        expect(result).to.only.have.keys('arguments', 'serializeStyle');
      });

      it('arguments should contain the unmodified child node', function () {
        const { arguments: [ actualChild ] } = not.buildNodeParams(childNode);
        expect(actualChild).to.be(childNode);
      });

      it('serializeStyle should default to "operator"', function () {
        const { serializeStyle } = not.buildNodeParams(childNode);
        expect(serializeStyle).to.be('operator');
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should wrap a subquery in an ES bool query\'s must_not clause', function () {
        const node = nodeTypes.function.buildNode('not', childNode);
        const result = not.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.only.have.keys('must_not');
        expect(result.bool.must_not).to.eql(ast.toElasticsearchQuery(childNode, indexPattern));
      });

      it('should wrap a literal argument with an "is" function targeting the default_field', function () {
        const literalFoo = nodeTypes.literal.buildNode('foo');
        const expectedChild = ast.toElasticsearchQuery(nodeTypes.function.buildNode('is', null, 'foo'), indexPattern);
        const node = nodeTypes.function.buildNode('not', literalFoo);
        const result = not.toElasticsearchQuery(node, indexPattern);
        const resultChild = result.bool.must_not;
        expectDeepEqual(resultChild, expectedChild);
      });

    });

    describe('toKueryExpression', function () {

      it('should serialize "not" nodes with an operator syntax', function () {
        const node = nodeTypes.function.buildNode('not', childNode, 'operator');
        const result = not.toKueryExpression(node);
        expect(result).to.be('!"response":200');
      });

      it('should wrap "and" and "or" sub-queries in parenthesis', function () {
        const andNode = nodeTypes.function.buildNode('and', [childNode, childNode], 'operator');
        const notAndNode = nodeTypes.function.buildNode('not', andNode, 'operator');
        expect(not.toKueryExpression(notAndNode)).to.be('!("response":200 and "response":200)');

        const orNode = nodeTypes.function.buildNode('or', [childNode, childNode], 'operator');
        const notOrNode = nodeTypes.function.buildNode('not', orNode, 'operator');
        expect(not.toKueryExpression(notOrNode)).to.be('!("response":200 or "response":200)');
      });

      it('should not wrap "and" and "or" sub-queries that use the function syntax', function () {
        const andNode = nodeTypes.function.buildNode('and', [childNode, childNode], 'function');
        const notAndNode = nodeTypes.function.buildNode('not', andNode, 'operator');
        expect(not.toKueryExpression(notAndNode)).to.be('!and("response":200, "response":200)');

        const orNode = nodeTypes.function.buildNode('or', [childNode, childNode], 'function');
        const notOrNode = nodeTypes.function.buildNode('not', orNode, 'operator');
        expect(not.toKueryExpression(notOrNode)).to.be('!or("response":200, "response":200)');
      });

      it('should throw an error for nodes with unknown or undefined serialize styles', function () {
        const node = nodeTypes.function.buildNode('not', childNode, 'notValid');
        expect(not.toKueryExpression)
          .withArgs(node).to.throwException(/Cannot serialize "not" function as "notValid"/);
      });

    });
  });
});
