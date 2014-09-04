define(function (require) {
  return ['AggConfig', function () {
    var sinon = require('test_utils/auto_release_sinon');

    var Vis;
    var AggConfig;
    var indexPattern;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      Vis = Private(require('components/vis/vis'));
      AggConfig = Private(require('components/vis/_agg_config'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    }));

    describe('#toDsl', function () {
      it('calls #write()', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_histogram',
              schema: 'segment'
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.date_histogram[0];
        var stub = sinon.stub(aggConfig, 'write').returns({ params: {} });

        aggConfig.toDsl();
        expect(stub.callCount).to.be(1);
      });

      it('uses the type name as the agg name', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_histogram',
              schema: 'segment'
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.date_histogram[0];
        sinon.stub(aggConfig, 'write').returns({ params: {} });

        var dsl = aggConfig.toDsl();
        expect(dsl).to.have.property('date_histogram');
      });


      it('uses the params from #write() output as the agg params', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_histogram',
              schema: 'segment'
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.date_histogram[0];
        var football = {};

        sinon.stub(aggConfig, 'write').returns({ params: football });

        var dsl = aggConfig.toDsl();
        expect(dsl.date_histogram).to.be(football);
      });

      it('includes subAggs from #write() output', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'avg',
              schema: 'metric'
            },
            {
              type: 'date_histogram',
              schema: 'segment'
            }
          ]
        });

        var histoConfig = vis.aggs.byTypeName.date_histogram[0];
        var avgConfig = vis.aggs.byTypeName.avg[0];
        var football = {};

        sinon.stub(histoConfig, 'write').returns({ params: {}, subAggs: [avgConfig] });
        sinon.stub(avgConfig, 'write').returns({ params: football });

        var dsl = histoConfig.toDsl();

        // didn't use .eql() because of variable key names, and final check is strict
        expect(dsl).to.have.property('aggs');
        expect(dsl.aggs).to.have.property(avgConfig.id);
        expect(dsl.aggs[avgConfig.id]).to.have.property('avg');
        expect(dsl.aggs[avgConfig.id].avg).to.be(football);
      });
    });
  }];
});