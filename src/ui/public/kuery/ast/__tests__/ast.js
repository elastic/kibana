import * as ast from '../ast';
import expect from 'expect.js';
import { nodeTypes } from '../../node_types/index';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal.js';


// Helpful utility allowing us to test the PEG parser by simply checking for deep equality between
// the nodes the parser generates and the nodes our constructor functions generate.
function fromKueryExpressionNoMeta(text) {
  return ast.fromKueryExpression(text, { includeMetadata: false });
}

let indexPattern;

describe('kuery AST API', function () {

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
  }));

  describe('fromKueryExpression', function () {

    it('should return location and text metadata for each AST node', function () {
      const notNode = ast.fromKueryExpression('!foo:bar');
      expect(notNode).to.have.property('text', '!foo:bar');
      expect(notNode.location).to.eql({ min: 0, max: 8 });

      const isNode = notNode.arguments[0];
      expect(isNode).to.have.property('text', 'foo:bar');
      expect(isNode.location).to.eql({ min: 1, max: 8 });

      const { arguments: [ argNode1, argNode2 ] } = isNode;
      expect(argNode1).to.have.property('text', 'foo');
      expect(argNode1.location).to.eql({ min: 1, max: 4 });

      expect(argNode2).to.have.property('text', 'bar');
      expect(argNode2.location).to.eql({ min: 5, max: 8 });
    });

    it('should return a match all "is" function for whitespace', function () {
      const expected = nodeTypes.function.buildNode('is', '*', '*');
      const actual = fromKueryExpressionNoMeta('  ');
      expectDeepEqual(actual, expected);
    });

    it('should return an "and" function for single literals', function () {
      const expected = nodeTypes.function.buildNode('and', [nodeTypes.literal.buildNode('foo')], 'implicit');
      const actual = fromKueryExpressionNoMeta('foo');
      expectDeepEqual(actual, expected);
    });

    it('should ignore extraneous whitespace at the beginning and end of the query', function () {
      const expected = nodeTypes.function.buildNode('and', [nodeTypes.literal.buildNode('foo')], 'implicit');
      const actual = fromKueryExpressionNoMeta('  foo ');
      expectDeepEqual(actual, expected);
    });

    it('literals and queries separated by whitespace should be joined by an implicit "and"', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'implicit');
      const actual = fromKueryExpressionNoMeta('foo bar');
      expectDeepEqual(actual, expected);
    });

    it('should also support explicit "and"s as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'operator');
      const actual = fromKueryExpressionNoMeta('foo and bar');
      expectDeepEqual(actual, expected);
    });

    it('should also support "and" as a function', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'function');
      const actual = fromKueryExpressionNoMeta('and(foo, bar)');
      expectDeepEqual(actual, expected);
    });

    it('should support "or" as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'operator');
      const actual = fromKueryExpressionNoMeta('foo or bar');
      expectDeepEqual(actual, expected);
    });

    it('should support "or" as a function', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'function');
      const actual = fromKueryExpressionNoMeta('or(foo, bar)');
      expectDeepEqual(actual, expected);
    });

    it('should support negation of queries with a "!" prefix', function () {
      const expected = nodeTypes.function.buildNode('not',
        nodeTypes.function.buildNode('or', [
          nodeTypes.literal.buildNode('foo'),
          nodeTypes.literal.buildNode('bar'),
        ], 'function'), 'operator');
      const actual = fromKueryExpressionNoMeta('!or(foo, bar)');
      expectDeepEqual(actual, expected);
    });

    it('"and" should have a higher precedence than "or"', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('and', [
            nodeTypes.literal.buildNode('bar'),
            nodeTypes.literal.buildNode('baz'),
          ], 'operator'),
          nodeTypes.literal.buildNode('qux'),
        ])
      ], 'operator');
      const actual = fromKueryExpressionNoMeta('foo or bar and baz or qux');
      expectDeepEqual(actual, expected);
    });

    it('should support grouping to override default precedence', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.literal.buildNode('foo'),
          nodeTypes.literal.buildNode('bar'),
        ], 'operator'),
        nodeTypes.literal.buildNode('baz'),
      ], 'operator');
      const actual = fromKueryExpressionNoMeta('(foo or bar) and baz');
      expectDeepEqual(actual, expected);
    });

    it('should support a shorthand operator syntax for "is" functions', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar', 'operator');
      const actual = fromKueryExpressionNoMeta('foo:bar');
      expectDeepEqual(actual, expected);
    });

    it('should support a shorthand operator syntax for inclusive "range" functions', function () {
      const argumentNodes = [
        nodeTypes.literal.buildNode('bytes'),
        nodeTypes.literal.buildNode(1000),
        nodeTypes.literal.buildNode(8000),
      ];
      const expected = nodeTypes.function.buildNodeWithArgumentNodes('range', argumentNodes, 'operator');
      const actual = fromKueryExpressionNoMeta('bytes:[1000 to 8000]');
      expectDeepEqual(actual, expected);
    });

    it('should support functions with named arguments', function () {
      const expected = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 }, 'function');
      const actual = fromKueryExpressionNoMeta('range(bytes, gt=1000, lt=8000)');
      expectDeepEqual(actual, expected);
    });

    it('should throw an error for unknown functions', function () {
      expect(ast.fromKueryExpression).withArgs('foo(bar)').to.throwException(/Unknown function "foo"/);
    });
  });

  describe('toKueryExpression', function () {

    it('should return the given node type\'s kuery string representation', function () {
      const node = nodeTypes.function.buildNode('exists', 'foo');
      const expected = nodeTypes.function.toKueryExpression(node);
      const result = ast.toKueryExpression(node);
      expectDeepEqual(result, expected);
    });

    it('should return an empty string for undefined nodes and unknown node types', function () {
      expect(ast.toKueryExpression()).to.be('');

      const noTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      delete noTypeNode.type;
      expect(ast.toKueryExpression(noTypeNode)).to.be('');

      const unknownTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      unknownTypeNode.type = 'notValid';
      expect(ast.toKueryExpression(unknownTypeNode)).to.be('');
    });

  });

  describe('toElasticsearchQuery', function () {

    it('should return the given node type\'s ES query representation', function () {
      const node = nodeTypes.function.buildNode('exists', 'response');
      const expected = nodeTypes.function.toElasticsearchQuery(node, indexPattern);
      const result = ast.toElasticsearchQuery(node, indexPattern);
      expectDeepEqual(result, expected);
    });

    it('should return an empty "and" function for undefined nodes and unknown node types', function () {
      const expected = nodeTypes.function.toElasticsearchQuery(nodeTypes.function.buildNode('and', []));

      expectDeepEqual(ast.toElasticsearchQuery(), expected);

      const noTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      delete noTypeNode.type;
      expectDeepEqual(ast.toElasticsearchQuery(noTypeNode), expected);

      const unknownTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      unknownTypeNode.type = 'notValid';
      expectDeepEqual(ast.toElasticsearchQuery(unknownTypeNode), expected);
    });

  });

  describe('symmetry of to/fromKueryExpression', function () {

    it('toKueryExpression and fromKueryExpression should be inverse operations', function () {
      function testExpression(expression) {
        expect(ast.toKueryExpression(ast.fromKueryExpression(expression))).to.be(expression);
      }

      testExpression('');
      testExpression('    ');
      testExpression('foo');
      testExpression('foo bar');
      testExpression('foo 200');
      testExpression('bytes:[1000 to 8000]');
      testExpression('bytes:[1000 TO    8000]');
      testExpression('range(bytes, gt=1000, lt=8000)');
      testExpression('range(bytes, gt=1000, lte=8000)');
      testExpression('range(bytes, gte=1000, lt=8000)');
      testExpression('range(bytes, gte=1000, lte=8000)');
      testExpression('response:200');
      testExpression('"response":200');
      testExpression('response:"200"');
      testExpression('"response":"200"');
      testExpression('is(response, 200)');
      testExpression('!is(response, 200)');
      testExpression('foo or is(tic, tock) or foo:bar');
      testExpression('or(foo, is(tic, tock), foo:bar)');
      testExpression('foo is(tic, tock) foo:bar');
      testExpression('foo and is(tic, tock) and foo:bar');
      testExpression('(foo or is(tic, tock)) and foo:bar');
      testExpression('!(foo or is(tic, tock)) and foo:bar');
    });

  });

});
