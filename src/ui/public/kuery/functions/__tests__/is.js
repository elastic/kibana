import expect from 'expect.js';
import * as is from '../is';
import { nodeTypes } from '../../node_types';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal';

let indexPattern;

describe('kuery functions', function () {

  describe('is', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('fieldName and value should be required arguments', function () {
        expect(is.buildNodeParams).to.throwException(/fieldName is a required argument/);
        expect(is.buildNodeParams).withArgs('foo').to.throwException(/value is a required argument/);
      });

      it('should return "arguments" and "serializeStyle" params', function () {
        const result = is.buildNodeParams('response', 200);
        expect(result).to.only.have.keys('arguments', 'serializeStyle');
      });

      it('arguments should contain the provided fieldName and value as literals', function () {
        const { arguments: [ fieldName, value ] } = is.buildNodeParams('response', 200);

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'response');

        expect(value).to.have.property('type', 'literal');
        expect(value).to.have.property('value', 200);
      });

      it('serializeStyle should default to "operator"', function () {
        const { serializeStyle } = is.buildNodeParams('response', 200);
        expect(serializeStyle).to.be('operator');
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES match_all query when fieldName and value are both "*"', function () {
        const expected = {
          match_all: {}
        };

        const node = nodeTypes.function.buildNode('is', '*', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should return an ES multi_match query using default_field when fieldName is null', function () {
        const expected = {
          multi_match: {
            query: 200,
            type: 'phrase',
            lenient: true,
          }
        };

        const node = nodeTypes.function.buildNode('is', null, 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should return an ES multi_match query when fieldName is "*"', function () {
        const expected = {
          multi_match: {
            query: 200,
            fields: ['*'],
            type: 'phrase',
            lenient: true,
          }
        };

        const node = nodeTypes.function.buildNode('is', '*', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should return an ES exists query when value is "*"', function () {
        const expected = {
          exists: { field: 'response' }
        };

        const node = nodeTypes.function.buildNode('is', 'response', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should return an ES match_phrase query when a concrete fieldName and value are provided', function () {
        const expected = {
          match_phrase: {
            response: 200
          }
        };

        const node = nodeTypes.function.buildNode('is', 'response', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should support scripted fields', function () {
        const node = nodeTypes.function.buildNode('is', 'script string', 'foo');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.key('script');
      });

    });

    describe('toKueryExpression', function () {

      it('should serialize "is" nodes with an operator syntax', function () {
        const node = nodeTypes.function.buildNode('is', 'response', 200, 'operator');
        const result = is.toKueryExpression(node);
        expect(result).to.be('"response":200');
      });

      it('should throw an error for nodes with unknown or undefined serialize styles', function () {
        const node = nodeTypes.function.buildNode('is', 'response', 200, 'notValid');
        expect(is.toKueryExpression)
          .withArgs(node).to.throwException(/Cannot serialize "is" function as "notValid"/);
      });

    });
  });
});
