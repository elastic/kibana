import expect from 'expect.js';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal.js';
import * as namedArg from '../named_arg';
import { nodeTypes } from '../../node_types';

describe('kuery node types', function () {

  describe('named arg', function () {

    describe('buildNode', function () {

      it('should return a node representing a named argument with the given value', function () {
        const result = namedArg.buildNode('fieldName', 'foo');
        expect(result).to.have.property('type', 'namedArg');
        expect(result).to.have.property('name', 'fieldName');
        expect(result).to.have.property('value');

        const literalValue = result.value;
        expect(literalValue).to.have.property('type', 'literal');
        expect(literalValue).to.have.property('value', 'foo');
      });

      it('should support literal nodes as values', function () {
        const value = nodeTypes.literal.buildNode('foo');
        const result = namedArg.buildNode('fieldName', value);
        expect(result.value).to.be(value);
        expectDeepEqual(result.value, value);
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return the argument value represented by the given node', function () {
        const node = namedArg.buildNode('fieldName', 'foo');
        const result = namedArg.toElasticsearchQuery(node);
        expect(result).to.be('foo');
      });

    });

  });

});
