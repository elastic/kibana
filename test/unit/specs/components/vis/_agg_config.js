define(function (require) {
  return ['AggConfig', function () {
    var sinon = require('test_utils/auto_release_sinon');

    var Vis;
    var AggType;
    var AggConfig;
    var indexPattern;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      Vis = Private(require('components/vis/vis'));
      AggType = Private(require('components/agg_types/_agg_type'));
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

    describe('::ensureIds', function () {
      it('accepts an array of objects and assigns ids to them', function () {
        var objs = [
          {},
          {},
          {},
          {}
        ];
        AggConfig.ensureIds(objs);
        expect(objs[0]).to.have.property('id', 1);
        expect(objs[1]).to.have.property('id', 2);
        expect(objs[2]).to.have.property('id', 3);
        expect(objs[3]).to.have.property('id', 4);
      });

      it('assigns ids relative to the other items in the list', function () {
        var objs = [
          { id: 100 },
          {},
        ];
        AggConfig.ensureIds(objs);
        expect(objs[0]).to.have.property('id', 100);
        expect(objs[1]).to.have.property('id', 101);
      });

      it('assigns ids relative to the other items in the list', function () {
        var objs = [
          { id: 100 },
          { id: 200 },
          { id: 500 },
          { id: 350 },
          {},
        ];
        AggConfig.ensureIds(objs);
        expect(objs[0]).to.have.property('id', 100);
        expect(objs[1]).to.have.property('id', 200);
        expect(objs[2]).to.have.property('id', 500);
        expect(objs[3]).to.have.property('id', 350);
        expect(objs[4]).to.have.property('id', 501);
      });

      it('uses ::nextId to get the starting value', function () {
        sinon.stub(AggConfig, 'nextId').returns(534);
        var objs = AggConfig.ensureIds([{}]);
        expect(objs[0]).to.have.property('id', 534);
      });

      it('only calls ::nextId once', function () {
        var start = 420;
        sinon.stub(AggConfig, 'nextId').returns(start);
        var objs = AggConfig.ensureIds([{}, {}, {}, {}, {}, {}, {}]);

        expect(AggConfig.nextId).to.have.property('callCount', 1);
        objs.forEach(function (obj, i) {
          expect(obj).to.have.property('id', start + i);
        });
      });
    });

    describe('::nextId', function () {
      it('accepts a list of objects and picks the next id', function () {
        var next = AggConfig.nextId([ {id: 100}, {id: 500} ]);
        expect(next).to.be(501);
      });

      it('handles an empty list', function () {
        var next = AggConfig.nextId([]);
        expect(next).to.be(1);
      });

      it('fails when the list is not defined', function () {
        expect(function () {
          AggConfig.nextId();
        }).to.throwError();
      });
    });

    describe('#toJSON', function () {
      it('includes the aggs id, params, type and schema', function () {
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
        expect(aggConfig.id).to.be(1);
        expect(aggConfig.params).to.be.an('object');
        expect(aggConfig.type).to.be.an(AggType).and.have.property('name', 'date_histogram');
        expect(aggConfig.schema).to.be.an('object').and.have.property('name', 'segment');

        var state = aggConfig.toJSON();
        expect(state).to.have.property('id', 1);
        expect(state.params).to.be.an('object');
        expect(state).to.have.property('type', 'date_histogram');
        expect(state).to.have.property('schema', 'segment');
      });
    });
  }];
});