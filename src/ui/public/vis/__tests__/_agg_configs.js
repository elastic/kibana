import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { VisProvider } from 'ui/vis';
import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisSchemasProvider } from 'ui/vis/schemas';
import { IndexedArray } from 'ui/indexed_array';

describe('AggConfigs', function () {

  let Vis;
  let AggConfig;
  let AggConfigs;
  let SpiedAggConfig;
  let indexPattern;
  let Schemas;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    // replace the AggConfig module with a spy
    AggConfig = Private(VisAggConfigProvider);
    const spy = sinon.spy(AggConfig);
    Object.defineProperty(spy, 'aggTypes', {
      get: function () { return AggConfig.aggTypes; },
      set: function (val) { AggConfig.aggTypes = val; }
    });

    Private.stub(VisAggConfigProvider, spy);

    // load main deps
    Vis = Private(VisProvider);
    SpiedAggConfig = Private(VisAggConfigProvider);
    AggConfigs = Private(VisAggConfigsProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    Schemas = Private(VisSchemasProvider);
  }));

  it('extends IndexedArray', function () {
    const ac = new AggConfigs();
    expect(ac).to.be.a(IndexedArray);
  });

  describe('constructor', function () {
    it('handles passing just a vis', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: []
      });

      const ac = new AggConfigs(vis);
      expect(ac).to.have.length(1);
    });

    it('converts configStates into AggConfig objects if they are not already', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: []
      });

      const ac = new AggConfigs(vis, [
        {
          type: 'date_histogram',
          schema: 'segment'
        },
        new AggConfig(vis, {
          type: 'terms',
          schema: 'split'
        })
      ]);

      expect(ac).to.have.length(3);
      expect(SpiedAggConfig).to.have.property('callCount', 3);
    });

    it('attemps to ensure that all states have an id', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: []
      });

      const states = [
        {
          type: 'date_histogram',
          schema: 'segment'
        },
        {
          type: 'terms',
          schema: 'split'
        }
      ];

      const spy = sinon.spy(SpiedAggConfig, 'ensureIds');
      new AggConfigs(vis, states);
      expect(spy.callCount).to.be(1);
      expect(spy.firstCall.args[0]).to.be(states);
    });

    describe('defaults', function () {
      let vis;
      beforeEach(function () {
        vis = {
          indexPattern: indexPattern,
          type: {
            schemas: new Schemas([
              {
                group: 'metrics',
                name: 'metric',
                title: 'Simple',
                min: 1,
                max: 2,
                defaults: [
                  { schema: 'metric', type: 'count' },
                  { schema: 'metric', type: 'avg' },
                  { schema: 'metric', type: 'sum' }
                ]
              },
              {
                group: 'buckets',
                name: 'segment',
                title: 'Example',
                min: 0,
                max: 1,
                defaults: [
                  { schema: 'segment', type: 'terms' },
                  { schema: 'segment', type: 'filters' }
                ]
              }
            ])
          }
        };
      });

      it('should only set the number of defaults defined by the max', function () {
        const ac = new AggConfigs(vis);
        expect(ac.bySchemaName.metric).to.have.length(2);
      });

      it('should set the defaults defined in the schema when none exist', function () {
        const ac = new AggConfigs(vis);
        expect(ac).to.have.length(3);
      });

      it('should NOT set the defaults defined in the schema when some exist', function () {
        const ac = new AggConfigs(vis, [{ schema: 'segment', type: 'date_histogram' }]);
        expect(ac).to.have.length(3);
        expect(ac.bySchemaName.segment[0].type.name).to.equal('date_histogram');
      });
    });
  });

  describe('#getRequestAggs', function () {
    it('performs a stable sort, but moves metrics to the bottom', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'avg', schema: 'metric' },
          { type: 'terms', schema: 'split' },
          { type: 'histogram', schema: 'split' },
          { type: 'sum', schema: 'metric' },
          { type: 'date_histogram', schema: 'segment' },
          { type: 'filters', schema: 'split' },
          { type: 'percentiles', schema: 'metric' }
        ]
      });

      const sorted = vis.aggs.getRequestAggs();
      const aggs = _.indexBy(vis.aggs, function (agg) {
        return agg.type.name;
      });

      expect(sorted.shift()).to.be(aggs.terms);
      expect(sorted.shift()).to.be(aggs.histogram);
      expect(sorted.shift()).to.be(aggs.date_histogram);
      expect(sorted.shift()).to.be(aggs.filters);
      expect(sorted.shift()).to.be(aggs.avg);
      expect(sorted.shift()).to.be(aggs.sum);
      expect(sorted.shift()).to.be(aggs.percentiles);
      expect(sorted).to.have.length(0);
    });
  });

  describe('#getResponseAggs', function () {
    it('returns all request aggs for basic aggs', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'terms', schema: 'split' },
          { type: 'date_histogram', schema: 'segment' },
          { type: 'count', schema: 'metric' }
        ]
      });

      const sorted = vis.aggs.getResponseAggs();
      const aggs = _.indexBy(vis.aggs, function (agg) {
        return agg.type.name;
      });

      expect(sorted.shift()).to.be(aggs.terms);
      expect(sorted.shift()).to.be(aggs.date_histogram);
      expect(sorted.shift()).to.be(aggs.count);
      expect(sorted).to.have.length(0);
    });

    it('expands aggs that have multiple responses', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'terms', schema: 'split' },
          { type: 'date_histogram', schema: 'segment' },
          { type: 'percentiles', schema: 'metric', params: { percents: [1, 2, 3] } }
        ]
      });

      const sorted = vis.aggs.getResponseAggs();
      const aggs = _.indexBy(vis.aggs, function (agg) {
        return agg.type.name;
      });

      expect(sorted.shift()).to.be(aggs.terms);
      expect(sorted.shift()).to.be(aggs.date_histogram);
      expect(sorted.shift().id).to.be(aggs.percentiles.id + '.' + 1);
      expect(sorted.shift().id).to.be(aggs.percentiles.id + '.' + 2);
      expect(sorted.shift().id).to.be(aggs.percentiles.id + '.' + 3);
      expect(sorted).to.have.length(0);
    });
  });

  describe('#toDsl', function () {
    it('uses the sorted aggs', function () {
      const vis = new Vis(indexPattern, { type: 'histogram' });
      sinon.spy(vis.aggs, 'getRequestAggs');
      vis.aggs.toDsl();
      expect(vis.aggs.getRequestAggs).to.have.property('callCount', 1);
    });

    it('calls aggConfig#toDsl() on each aggConfig and compiles the nested output', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'date_histogram', schema: 'segment' },
          { type: 'filters', schema: 'split' }
        ]
      });

      const aggInfos = vis.aggs.map(function (aggConfig) {
        const football = {};

        sinon.stub(aggConfig, 'toDsl', function () {
          return football;
        });

        return {
          id: aggConfig.id,
          football: football
        };
      });

      (function recurse(lvl) {
        const info = aggInfos.shift();

        expect(lvl).to.have.property(info.id);
        expect(lvl[info.id]).to.be(info.football);

        if (lvl[info.id].aggs) {
          return recurse(lvl[info.id].aggs);
        }
      }(vis.aggs.toDsl()));

      expect(aggInfos).to.have.length(1);
    });

    it('skips aggs that don\'t have a dsl representation', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
          { type: 'count', schema: 'metric' }
        ]
      });

      const dsl = vis.aggs.toDsl();
      const histo = vis.aggs.byTypeName.date_histogram[0];
      const count = vis.aggs.byTypeName.count[0];

      expect(dsl).to.have.property(histo.id);
      expect(dsl[histo.id]).to.be.an('object');
      expect(dsl[histo.id]).to.not.have.property('aggs');
      expect(dsl).to.not.have.property(count.id);
    });

    it('writes multiple metric aggregations at the same level', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
          { type: 'avg', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'sum', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'min', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'max', schema: 'metric', params: { field: 'bytes' }  }
        ]
      });

      const dsl = vis.aggs.toDsl();

      const histo = vis.aggs.byTypeName.date_histogram[0];
      const metrics = vis.aggs.bySchemaGroup.metrics;

      expect(dsl).to.have.property(histo.id);
      expect(dsl[histo.id]).to.be.an('object');
      expect(dsl[histo.id]).to.have.property('aggs');

      metrics.forEach(function (metric) {
        expect(dsl[histo.id].aggs).to.have.property(metric.id);
        expect(dsl[histo.id].aggs[metric.id]).to.not.have.property('aggs');
      });
    });

    it('writes multiple metric aggregations at every level if the vis is hierarchical', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'terms', schema: 'segment', params: { field: 'ip', orderBy: 1 } },
          { type: 'terms', schema: 'segment', params: { field: 'extension', orderBy: 1 } },
          { id: 1, type: 'avg', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'sum', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'min', schema: 'metric', params: { field: 'bytes' }  },
          { type: 'max', schema: 'metric', params: { field: 'bytes' }  }
        ]
      });
      vis.isHierarchical = _.constant(true);

      const topLevelDsl = vis.aggs.toDsl();
      const buckets = vis.aggs.bySchemaGroup.buckets;
      const metrics = vis.aggs.bySchemaGroup.metrics;

      (function checkLevel(dsl) {
        const bucket = buckets.shift();
        expect(dsl).to.have.property(bucket.id);

        expect(dsl[bucket.id]).to.be.an('object');
        expect(dsl[bucket.id]).to.have.property('aggs');

        metrics.forEach(function (metric) {
          expect(dsl[bucket.id].aggs).to.have.property(metric.id);
          expect(dsl[bucket.id].aggs[metric.id]).to.not.have.property('aggs');
        });

        if (buckets.length) {
          checkLevel(dsl[bucket.id].aggs);
        }
      }(topLevelDsl));
    });
  });
});
