import expect from 'expect.js';
import * as or from '../or';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;

const childNode1 = nodeTypes.function.buildNode('is', 'machine.os', 'osx');
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('or', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('arguments should contain the unmodified child nodes', function () {
        const result = or.buildNodeParams([childNode1, childNode2]);
        const { arguments: [ actualChildNode1, actualChildNode2 ] } = result;
        expect(actualChildNode1).to.be(childNode1);
        expect(actualChildNode2).to.be(childNode2);
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

      it('should require one of the clauses to match', function () {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        expect(result.bool).to.have.property('minimum_should_match', 1);
      });

    });

  });
});
