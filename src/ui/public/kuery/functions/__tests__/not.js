import expect from 'expect.js';
import * as not from '../not';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import indexPatternResponse from '../../__tests__/index_pattern_response.json';


let indexPattern;

const childNode = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('not', function () {


    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {

      it('arguments should contain the unmodified child node', function () {
        const { arguments: [ actualChild ] } = not.buildNodeParams(childNode);
        expect(actualChild).to.be(childNode);
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
    });
  });
});
