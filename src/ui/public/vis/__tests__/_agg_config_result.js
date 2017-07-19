import AggConfigResult from 'ui/vis/agg_config_result';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('AggConfigResult', function () {
  let indexPattern;
  let Vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('initialization', function () {
    it('should set the type to bucket for bucket based results', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'terms', schema: 'segment', params: { field: '_type' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.terms[0];
      const results = new AggConfigResult(aggConfig, null, 10, 'apache');
      expect(results).to.have.property('aggConfig', aggConfig);
      expect(results).to.have.property('$parent', null);
      expect(results).to.have.property('type', 'bucket');
      expect(results).to.have.property('value', 10);
      expect(results).to.have.property('key', 'apache');
    });

    it('should set the type to metric for metric based results', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'avg', schema: 'metric', params: { field: 'bytes' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.avg[0];
      const results = new AggConfigResult(aggConfig, null, 1024);
      expect(results).to.have.property('aggConfig', aggConfig);
      expect(results).to.have.property('$parent', null);
      expect(results).to.have.property('type', 'metric');
      expect(results).to.have.property('value', 1024);
      expect(results).to.have.property('key', undefined);
    });
  });


  describe('hierarchical', function () {
    describe('getPath()', function () {

      it('should return the parent and itself (in an array) for the path', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: '_type' } },
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const parentAggConfig = vis.aggs.byTypeName.terms[0];
        const aggConfig = vis.aggs.byTypeName.terms[1];
        const parentResult = new AggConfigResult(parentAggConfig, null, 20, 'apache');
        const result = new AggConfigResult(aggConfig, parentResult, 15, 'php');
        const path = result.getPath();
        expect(path).to.be.an(Array);
        expect(path).to.have.length(2);
        expect(path[0]).to.be(parentResult);
        expect(path[1]).to.be(result);
      });

      it('should return itself (in an array) for the path', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const aggConfig = vis.aggs.byTypeName.terms[0];
        const result = new AggConfigResult(aggConfig, null, 15, 'php');
        const path = result.getPath();
        expect(path).to.be.an(Array);
        expect(path).to.have.length(1);
        expect(path[0]).to.be(result);
      });

    });

    describe('createFilter', function () {
      it('should return a filter object that represents the result', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const aggConfig = vis.aggs.byTypeName.terms[0];
        const result = new AggConfigResult(aggConfig, null, 15, 'php');
        const filter = result.createFilter();
        expect(filter).to.have.property('query');
        expect(filter.query).to.have.property('match');
        expect(filter.query.match).to.have.property('extension');
        expect(filter.query.match.extension).to.have.property('query', 'php');
        expect(filter.query.match.extension).to.have.property('type', 'phrase');
      });
    });
  });
});
