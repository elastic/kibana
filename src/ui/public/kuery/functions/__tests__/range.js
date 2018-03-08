import expect from 'expect.js';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal';
import * as range from '../range';
import { nodeTypes } from '../../node_types';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;

describe('kuery functions', function () {

  describe('range', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('arguments should contain the provided fieldName as a literal', function () {
        const result = range.buildNodeParams('bytes', { gt: 1000, lt: 8000 });
        const { arguments: [fieldName] } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'bytes');
      });

      it('arguments should contain the provided params as named arguments', function () {
        const givenParams = { gt: 1000, lt: 8000, format: 'epoch_millis' };
        const result = range.buildNodeParams('bytes', givenParams);
        const { arguments: [, ...params] } = result;

        expect(params).to.be.an('array');
        expect(params).to.not.be.empty();

        params.map((param) => {
          expect(param).to.have.property('type', 'namedArg');
          expect(['gt', 'lt', 'format'].includes(param.name)).to.be(true);
          expect(param.value.type).to.be('literal');
          expect(param.value.value).to.be(givenParams[param.name]);
        });
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES range query for the node\'s field and params', function () {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                    lt: 8000
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should support wildcard field names', function () {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                    lt: 8000
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('range', 'byt*', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expectDeepEqual(result, expected);
      });

      it('should support scripted fields', function () {
        const node = nodeTypes.function.buildNode('range', 'script number', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expect(result.bool.should[0]).to.have.key('script');
      });

    });
  });
});
