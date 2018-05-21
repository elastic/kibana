import expect from 'expect.js';
import * as exists from '../exists';
import { nodeTypes } from '../../node_types';
import _ from 'lodash';
import indexPatternResponse from '../../__tests__/index_pattern_response.json';


let indexPattern;

describe('kuery functions', function () {
  describe('exists', function () {

    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {
      it('should return a single "arguments" param', function () {
        const result = exists.buildNodeParams('response');
        expect(result).to.only.have.key('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function () {
        const { arguments: [ arg ] } = exists.buildNodeParams('response');
        expect(arg).to.have.property('type', 'literal');
        expect(arg).to.have.property('value', 'response');
      });
    });

    describe('toElasticsearchQuery', function () {
      it('should return an ES exists query', function () {
        const expected = {
          exists: { field: 'response' }
        };

        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(existsNode, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });

      it('should throw an error for scripted fields', function () {
        const existsNode = nodeTypes.function.buildNode('exists', 'script string');
        expect(exists.toElasticsearchQuery)
          .withArgs(existsNode, indexPattern).to.throwException(/Exists query does not support scripted fields/);
      });

    });
  });
});
