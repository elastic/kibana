define(function (require) {
  return ['AggConfigs', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');

    var Vis;
    var IndexedArray;
    var AggConfig;
    var AggConfigs;
    var SpiedAggConfig;
    var indexPattern;
    var Schemas;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      // replace the AggConfig module with a spy
      var RealAggConfigPM = require('components/vis/_agg_config');
      AggConfig = Private(RealAggConfigPM);
      Private.stub(RealAggConfigPM, sinon.spy(AggConfig));

      // load main deps
      Vis = Private(require('components/vis/vis'));
      SpiedAggConfig = Private(require('components/vis/_agg_config'));
      AggConfigs = Private(require('components/vis/_agg_configs'));
      IndexedArray = require('utils/indexed_array/index');
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      Schemas = Private(require('plugins/vis_types/_schemas'));
    }));

    it('extends IndexedArray', function () {
      var ac = new AggConfigs();
      expect(ac).to.be.a(IndexedArray);
    });

    describe('constructor', function () {
      it('handles passing just a vis', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: []
        });

        var ac = new AggConfigs(vis);
        expect(ac).to.have.length(1);
      });

      it('converts configStates into AggConfig objects if they are not already', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: []
        });

        var ac = new AggConfigs(vis, [
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
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: []
        });

        var states = [
          {
            type: 'date_histogram',
            schema: 'segment'
          },
          {
            type: 'terms',
            schema: 'split'
          }
        ];

        var spy = sinon.spy(SpiedAggConfig, 'ensureIds');
        var ac = new AggConfigs(vis, states);
        expect(spy.callCount).to.be(1);
        expect(spy.firstCall.args[0]).to.be(states);
      });

      describe('defaults', function () {
        var vis;
        beforeEach(function () {
          vis = {
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
          var ac = new AggConfigs(vis);
          expect(ac.bySchemaName['metric']).to.have.length(2);
        });

        it('should set the defaults defined in the schema when none exist', function () {
          var ac = new AggConfigs(vis);
          expect(ac).to.have.length(3);
        });

        it('should NOT set the defaults defined in the schema when some exist', function () {
          var ac = new AggConfigs(vis, [{ schema: 'segment', type: 'date_histogram' }]);
          expect(ac).to.have.length(3);
          expect(ac.bySchemaName['segment'][0].type.name).to.equal('date_histogram');
        });

      });
    });

    describe('#getSorted', function () {
      it('performs a stable sort, but moves metrics to the bottom', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'avg', schema: 'metric' },
            { type: 'terms', schema: 'split' },
            { type: 'histogram', schema: 'split' },
            { type: 'sum', schema: 'metric' },
            { type: 'date_histogram', schema: 'segment' },
            { type: 'filters', schema: 'split' },
            { type: 'count', schema: 'metric' }
          ]
        });

        var avg = vis.aggs.byTypeName.avg[0];
        var sum = vis.aggs.byTypeName.sum[0];
        var count = vis.aggs.byTypeName.count[0];
        var terms = vis.aggs.byTypeName.terms[0];
        var histo = vis.aggs.byTypeName.histogram[0];
        var dateHisto = vis.aggs.byTypeName.date_histogram[0];
        var filters = vis.aggs.byTypeName.filters[0];

        var sorted = vis.aggs.getSorted();

        expect(sorted.shift()).to.be(terms);
        expect(sorted.shift()).to.be(histo);
        expect(sorted.shift()).to.be(dateHisto);
        expect(sorted.shift()).to.be(filters);
        expect(sorted.shift()).to.be(avg);
        expect(sorted.shift()).to.be(sum);
        expect(sorted.shift()).to.be(count);
        expect(sorted).to.have.length(0);
      });
    });

    describe('#toDsl', function () {
      it('uses the sorted aggs', function () {
        var vis = new Vis(indexPattern, { type: 'histogram' });
        sinon.spy(vis.aggs, 'getSorted');
        vis.aggs.toDsl();
        expect(vis.aggs.getSorted).to.have.property('callCount', 1);
      });

      it('calls aggConfig#toDsl() on each aggConfig and compiles the nested output', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'date_histogram', schema: 'segment' },
            { type: 'filters', schema: 'split' }
          ]
        });

        var aggInfos = vis.aggs.map(function (aggConfig) {
          var football = {};

          sinon.stub(aggConfig, 'toDsl', function () {
            return football;
          });

          return {
            id: aggConfig.id,
            football: football
          };
        });

        (function recurse(lvl) {
          var info = aggInfos.shift();

          expect(lvl).to.have.property(info.id);
          expect(lvl[info.id]).to.be(info.football);

          if (lvl[info.id].aggs) {
            return recurse(lvl[info.id].aggs);
          }
        }(vis.aggs.toDsl()));

        expect(aggInfos).to.have.length(1);
      });

      it('skips aggs that don\'t have a dsl representation', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
            { type: 'count', schema: 'metric' }
          ]
        });

        var dsl = vis.aggs.toDsl();
        var histo = vis.aggs.byTypeName.date_histogram[0];
        var count = vis.aggs.byTypeName.count[0];

        expect(dsl).to.have.property(histo.id);
        expect(dsl[histo.id]).to.be.an('object');
        expect(dsl[histo.id]).to.not.have.property('aggs');
        expect(dsl).to.not.have.property(count.id);
      });

      it('writes multiple metric aggregations at the same level', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
            { type: 'avg', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'sum', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'min', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'max', schema: 'metric', params: { field: 'bytes' }  }
          ]
        });

        var dsl = vis.aggs.toDsl();

        var histo = vis.aggs.byTypeName.date_histogram[0];
        var metrics = vis.aggs.bySchemaGroup.metrics;

        expect(dsl).to.have.property(histo.id);
        expect(dsl[histo.id]).to.be.an('object');
        expect(dsl[histo.id]).to.have.property('aggs');

        metrics.forEach(function (metric) {
          expect(dsl[histo.id].aggs).to.have.property(metric.id);
          expect(dsl[histo.id].aggs[metric.id]).to.not.have.property('aggs');
        });
      });

      it('writes multiple metric aggregations at every level if the vis is hierarchical', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'ip' } },
            { type: 'terms', schema: 'segment', params: { field: 'extension' } },
            { type: 'avg', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'sum', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'min', schema: 'metric', params: { field: 'bytes' }  },
            { type: 'max', schema: 'metric', params: { field: 'bytes' }  }
          ]
        });
        vis.isHierarchical = _.constant(true);

        var topLevelDsl = vis.aggs.toDsl();
        var buckets = vis.aggs.bySchemaGroup.buckets;
        var metrics = vis.aggs.bySchemaGroup.metrics;

        (function checkLevel(dsl) {
          var bucket = buckets.shift();
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
  }];
});
