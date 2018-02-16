import expect from 'expect.js';
import * as and from '../and';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;

const childNode1 = nodeTypes.function.buildNode('is', 'machine.os', 'osx');
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('and', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    describe('buildNodeParams', function () {

      it('arguments should contain the unmodified child nodes', function () {
        const result = and.buildNodeParams([childNode1, childNode2]);
        const { arguments: [ actualChildNode1, actualChildNode2 ] } = result;
        expect(actualChildNode1).to.be(childNode1);
        expect(actualChildNode2).to.be(childNode2);
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should wrap subqueries in an ES bool query\'s filter clause', function () {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2]);
        const result = and.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.only.have.keys('filter');
        expect(result.bool.filter).to.eql(
          [childNode1, childNode2].map((childNode) => ast.toElasticsearchQuery(childNode, indexPattern))
        );
      });

    });

  });
});
