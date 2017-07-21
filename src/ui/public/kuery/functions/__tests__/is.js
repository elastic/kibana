import expect from 'expect.js';
import * as is from '../is';
import { nodeTypes } from '../../node_types';
import _ from 'lodash';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

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
        expect(_.isEqual(expected, result)).to.be(true);
      });

      it('should return an ES simple_query_string query in all fields mode when fieldName is "*"', function () {
        const expected = {
          simple_query_string: {
            query: '"200"',
            all_fields: true,
          }
        };

        const node = nodeTypes.function.buildNode('is', '*', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });

      // See discussion about kuery escaping for background:
      // https://github.com/elastic/kibana/pull/12624#issuecomment-312650307
      it('should ensure the simple_query_string query is wrapped in double quotes to force a phrase search', function () {
        const node = nodeTypes.function.buildNode('is', '*', '+response');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result.simple_query_string.query).to.be('"+response"');
      });

      it('already double quoted phrases should not get wrapped a second time', function () {
        const node = nodeTypes.function.buildNode('is', '*', '"+response"');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result.simple_query_string.query).to.be('"+response"');
      });

      it('should return an ES exists query when value is "*"', function () {
        const expected = {
          exists: { field: 'response' }
        };

        const node = nodeTypes.function.buildNode('is', 'response', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });

      it('should return an ES match_phrase query when a concrete fieldName and value are provided', function () {
        const expected = {
          match_phrase: {
            response: 200
          }
        };

        const node = nodeTypes.function.buildNode('is', 'response', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
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
