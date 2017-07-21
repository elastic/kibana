import * as functionType from '../function';
import _ from 'lodash';
import expect from 'expect.js';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal.js';
import * as isFunction from '../../functions/is';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { nodeTypes } from '../../node_types';

describe('kuery node types', function () {

  describe('function', function () {

    let indexPattern;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNode', function () {

      it('should return a node representing the given kuery function', function () {
        const result = functionType.buildNode('is', 'response', 200);
        expect(result).to.have.property('type', 'function');
        expect(result).to.have.property('function', 'is');
        expect(result).to.have.property('arguments');
      });

    });

    describe('buildNodeWithArgumentNodes', function () {

      it('should return a function node with the given argument list untouched', function () {
        const fieldNameLiteral = nodeTypes.literal.buildNode('response');
        const valueLiteral = nodeTypes.literal.buildNode(200);
        const argumentNodes = [fieldNameLiteral, valueLiteral];
        const result = functionType.buildNodeWithArgumentNodes('is', argumentNodes);

        expect(result).to.have.property('type', 'function');
        expect(result).to.have.property('function', 'is');
        expect(result).to.have.property('arguments');
        expect(result.arguments).to.be(argumentNodes);
        expectDeepEqual(result.arguments, argumentNodes);
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return the given function type\'s ES query representation', function () {
        const node = functionType.buildNode('is', 'response', 200);
        const expected = isFunction.toElasticsearchQuery(node, indexPattern);
        const result = functionType.toElasticsearchQuery(node, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });

    });

    describe('toKueryExpression', function () {

      it('should return the function syntax representation of the given node by default', function () {
        const node = functionType.buildNode('exists', 'foo');
        expect(functionType.toKueryExpression(node)).to.be('exists("foo")');
      });

      it('should return the function syntax representation of the given node if serializeStyle is "function"', function () {
        const node = functionType.buildNode('exists', 'foo');
        node.serializeStyle = 'function';
        expect(functionType.toKueryExpression(node)).to.be('exists("foo")');
      });

      it('should defer to the function\'s serializer if another serializeStyle is specified', function () {
        const node = functionType.buildNode('is', 'response', 200);
        expect(node.serializeStyle).to.be('operator');
        expect(functionType.toKueryExpression(node)).to.be('"response":200');
      });

      it('should simply return the node\'s "text" property if one exists', function () {
        const node = functionType.buildNode('exists', 'foo');
        node.text = 'bar';
        expect(functionType.toKueryExpression(node)).to.be('bar');
      });

    });

  });

});
