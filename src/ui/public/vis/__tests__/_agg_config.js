import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VisProvider from 'ui/vis';
import AggTypesAggTypeProvider from 'ui/agg_types/agg_type';
import VisAggConfigProvider from 'ui/vis/agg_config';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('AggConfig', function () {

  let Vis;
  let AggType;
  let AggConfig;
  let indexPattern;
  let fieldFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    AggType = Private(AggTypesAggTypeProvider);
    AggConfig = Private(VisAggConfigProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    fieldFormat = Private(RegistryFieldFormatsProvider);
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
      expect(objs[0]).to.have.property('id', '1');
      expect(objs[1]).to.have.property('id', '2');
      expect(objs[2]).to.have.property('id', '3');
      expect(objs[3]).to.have.property('id', '4');
    });

    it('assigns ids relative to the other items in the list', function () {
      var objs = [
        { id: '100' },
        {},
      ];
      AggConfig.ensureIds(objs);
      expect(objs[0]).to.have.property('id', '100');
      expect(objs[1]).to.have.property('id', '101');
    });

    it('assigns ids relative to the other items in the list', function () {
      var objs = [
        { id: '100' },
        { id: '200' },
        { id: '500' },
        { id: '350' },
        {},
      ];
      AggConfig.ensureIds(objs);
      expect(objs[0]).to.have.property('id', '100');
      expect(objs[1]).to.have.property('id', '200');
      expect(objs[2]).to.have.property('id', '500');
      expect(objs[3]).to.have.property('id', '350');
      expect(objs[4]).to.have.property('id', '501');
    });

    it('uses ::nextId to get the starting value', function () {
      sinon.stub(AggConfig, 'nextId').returns(534);
      var objs = AggConfig.ensureIds([{}]);
      expect(objs[0]).to.have.property('id', '534');
    });

    it('only calls ::nextId once', function () {
      var start = 420;
      sinon.stub(AggConfig, 'nextId').returns(start);
      var objs = AggConfig.ensureIds([{}, {}, {}, {}, {}, {}, {}]);

      expect(AggConfig.nextId).to.have.property('callCount', 1);
      objs.forEach(function (obj, i) {
        expect(obj).to.have.property('id', String(start + i));
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
      expect(aggConfig.id).to.be('1');
      expect(aggConfig.params).to.be.an('object');
      expect(aggConfig.type).to.be.an(AggType).and.have.property('name', 'date_histogram');
      expect(aggConfig.schema).to.be.an('object').and.have.property('name', 'segment');

      var state = aggConfig.toJSON();
      expect(state).to.have.property('id', '1');
      expect(state.params).to.be.an('object');
      expect(state).to.have.property('type', 'date_histogram');
      expect(state).to.have.property('schema', 'segment');
    });
  });

  describe('#makeLabel', function () {
    it('uses the custom label if it is defined', function () {
      var vis = new Vis(indexPattern, {});
      var aggConfig = vis.aggs[0];
      aggConfig.params.customLabel = 'Custom label';
      var label = aggConfig.makeLabel();
      expect(label).to.be(aggConfig.params.customLabel);
    });
    it('default label should be "Count"', function () {
      var vis = new Vis(indexPattern, {});
      var aggConfig = vis.aggs[0];
      var label = aggConfig.makeLabel();
      expect(label).to.be('Count');
    });
    it('default label should be "Percentage of Count" when Vis is in percentage mode', function () {
      var vis = new Vis(indexPattern, {});
      var aggConfig = vis.aggs[0];
      aggConfig.vis.params.mode = 'percentage';
      var label = aggConfig.makeLabel();
      expect(label).to.be('Percentage of Count');
    });
    it('empty label if the Vis type is not defined', function () {
      var vis = new Vis(indexPattern, {});
      var aggConfig = vis.aggs[0];
      aggConfig.type = undefined;
      var label = aggConfig.makeLabel();
      expect(label).to.be('');
    });
  });

  describe('#fieldFormatter', function () {
    it('returns the fields format unless the agg type has a custom getFormat handler', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });
      expect(vis.aggs[0].fieldFormatter()).to.be(vis.aggs[0].field().format.getConverterFor());

      vis = new Vis(indexPattern, {
        type: 'metric',
        aggs: [
          {
            type: 'count',
            schema: 'metric',
            params: { field: '@timestamp' }
          }
        ]
      });
      expect(vis.aggs[0].fieldFormatter()).to.be(fieldFormat.getDefaultInstance('number').getConverterFor());
    });

    it('returns the string format if the field does not have a format', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });

      var agg = vis.aggs[0];
      agg.params.field = { type: 'date', format: null };
      expect(agg.fieldFormatter()).to.be(fieldFormat.getDefaultInstance('string').getConverterFor());
    });

    it('returns the string format if their is no field', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });

      var agg = vis.aggs[0];
      delete agg.params.field;
      expect(agg.fieldFormatter()).to.be(fieldFormat.getDefaultInstance('string').getConverterFor());
    });

    it('returns the html converter if "html" is passed in', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'avg',
            schema: 'metric',
            params: { field: 'ssl' }
          }
        ]
      });

      var field = indexPattern.fields.byName.ssl;
      expect(vis.aggs[0].fieldFormatter('html')).to.be(field.format.getConverterFor('html'));
    });
  });
});
