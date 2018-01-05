import expect from 'expect.js';
import * as or from '../or';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal';

let indexPattern;

const childNode1 = nodeTypes.function.buildNode('is', 'response', 200);
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('or', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('should return "arguments" and "serializeStyle" params', function () {
        const result = or.buildNodeParams([childNode1, childNode2]);
        expect(result).to.only.have.keys('arguments', 'serializeStyle');
      });

      it('arguments should contain the unmodified child nodes', function () {
        const result = or.buildNodeParams([childNode1, childNode2]);
        const { arguments: [ actualChildNode1, actualChildNode2 ] } = result;
        expect(actualChildNode1).to.be(childNode1);
        expect(actualChildNode2).to.be(childNode2);
      });

      it('serializeStyle should default to "operator"', function () {
        const { serializeStyle } = or.buildNodeParams([childNode1, childNode2]);
        expect(serializeStyle).to.be('operator');
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should wrap subqueries in an ES bool query\'s should clause', function () {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.have.keys('should');
        expect(result.bool.should).to.eql(
          [childNode1, childNode2].map((childNode) => ast.toElasticsearchQuery(childNode, indexPattern))
        );
      });

      it('should wrap a literal argument with an "is" function targeting the default_field', function () {
        const literalFoo = nodeTypes.literal.buildNode('foo');
        const expectedChild = ast.toElasticsearchQuery(nodeTypes.function.buildNode('is', null, 'foo'), indexPattern);
        const node = nodeTypes.function.buildNode('or', [literalFoo]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        const resultChild = result.bool.should[0];
        expectDeepEqual(resultChild, expectedChild);
      });

      it('should require one of the clauses to match', function () {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        expect(result.bool).to.have.property('minimum_should_match', 1);
      });

    });

    describe('toKueryExpression', function () {

      it('should serialize "or" nodes with an operator syntax', function () {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toKueryExpression(node);
        expect(result).to.be('"response":200 or "extension":"jpg"');
      });

      it('should throw an error for nodes with unknown or undefined serialize styles', function () {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2], 'notValid');
        expect(or.toKueryExpression)
          .withArgs(node).to.throwException(/Cannot serialize "or" function as "notValid"/);
      });

    });
  });
});
