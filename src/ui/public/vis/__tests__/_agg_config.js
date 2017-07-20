import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { AggTypesAggTypeProvider } from 'ui/agg_types/agg_type';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

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
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.date_histogram[0];
      const stub = sinon.stub(aggConfig, 'write').returns({ params: {} });

      aggConfig.toDsl();
      expect(stub.callCount).to.be(1);
    });

    it('uses the type name as the agg name', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.date_histogram[0];
      sinon.stub(aggConfig, 'write').returns({ params: {} });

      const dsl = aggConfig.toDsl();
      expect(dsl).to.have.property('date_histogram');
    });

    it('uses the params from #write() output as the agg params', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.date_histogram[0];
      const football = {};

      sinon.stub(aggConfig, 'write').returns({ params: football });

      const dsl = aggConfig.toDsl();
      expect(dsl.date_histogram).to.be(football);
    });

    it('includes subAggs from #write() output', function () {
      const vis = new Vis(indexPattern, {
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

      const histoConfig = vis.aggs.byTypeName.date_histogram[0];
      const avgConfig = vis.aggs.byTypeName.avg[0];
      const football = {};

      sinon.stub(histoConfig, 'write').returns({ params: {}, subAggs: [avgConfig] });
      sinon.stub(avgConfig, 'write').returns({ params: football });

      const dsl = histoConfig.toDsl();

      // didn't use .eql() because of variable key names, and final check is strict
      expect(dsl).to.have.property('aggs');
      expect(dsl.aggs).to.have.property(avgConfig.id);
      expect(dsl.aggs[avgConfig.id]).to.have.property('avg');
      expect(dsl.aggs[avgConfig.id].avg).to.be(football);
    });
  });

  describe('::ensureIds', function () {
    it('accepts an array of objects and assigns ids to them', function () {
      const objs = [
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
      const objs = [
        { id: '100' },
        {},
      ];
      AggConfig.ensureIds(objs);
      expect(objs[0]).to.have.property('id', '100');
      expect(objs[1]).to.have.property('id', '101');
    });

    it('assigns ids relative to the other items in the list', function () {
      const objs = [
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
      const objs = AggConfig.ensureIds([{}]);
      expect(objs[0]).to.have.property('id', '534');
    });

    it('only calls ::nextId once', function () {
      const start = 420;
      sinon.stub(AggConfig, 'nextId').returns(start);
      const objs = AggConfig.ensureIds([{}, {}, {}, {}, {}, {}, {}]);

      expect(AggConfig.nextId).to.have.property('callCount', 1);
      objs.forEach(function (obj, i) {
        expect(obj).to.have.property('id', String(start + i));
      });
    });
  });

  describe('::nextId', function () {
    it('accepts a list of objects and picks the next id', function () {
      const next = AggConfig.nextId([ { id: 100 }, { id: 500 } ]);
      expect(next).to.be(501);
    });

    it('handles an empty list', function () {
      const next = AggConfig.nextId([]);
      expect(next).to.be(1);
    });

    it('fails when the list is not defined', function () {
      expect(function () {
        AggConfig.nextId();
      }).to.throwError();
    });
  });

  describe('#toJsonDataEquals', function () {

    const testsIdentical = [{
      type: 'metric',
      aggs: [
        {
          type: 'count',
          schema: 'metric',
          params: { field: '@timestamp' }
        }
      ]
    }, {
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
    }];

    testsIdentical.forEach((visConfig, index) => {
      it(`identical aggregations (${index})`, function () {
        const vis1 = new Vis(indexPattern, visConfig);
        const vis2 = new Vis(indexPattern, visConfig);
        expect(vis1.aggs.jsonDataEquals(vis2.aggs)).to.be(true);
      });
    });

    const testsIdenticalDifferentOrder = [{
      config1: {
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
      },
      config2: {
        type: 'histogram',
        aggs: [
          {
            schema: 'metric',
            type: 'avg'

          },
          {
            schema: 'segment',
            type: 'date_histogram'
          }
        ]
      }
    }];

    testsIdenticalDifferentOrder.forEach((test, index) => {
      it(`identical aggregations (${index}) - init json is in different order`, function () {
        const vis1 = new Vis(indexPattern, test.config1);
        const vis2 = new Vis(indexPattern, test.config2);
        expect(vis1.aggs.jsonDataEquals(vis2.aggs)).to.be(true);
      });
    });

    const testsDifferent = [{
      config1: {
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
      },
      config2: {
        type: 'histogram',
        aggs: [
          {
            type: 'max',
            schema: 'metric'

          },
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      }
    },{
      config1: {
        type: 'metric',
        aggs: [
          {
            type: 'count',
            schema: 'metric',
            params: { field: '@timestamp' }
          }
        ]
      },
      config2: {
        type: 'metric',
        aggs: [
          {
            type: 'count',
            schema: 'metric',
            params: { field: '@timestamp' }
          },
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      }
    }];

    testsDifferent.forEach((test, index) => {
      it(`different aggregations (${index})`, function () {
        const vis1 = new Vis(indexPattern, test.config1);
        const vis2 = new Vis(indexPattern, test.config2);
        expect(vis1.aggs.jsonDataEquals(vis2.aggs)).to.be(false);
      });
    });


  });

  describe('#toJSON', function () {
    it('includes the aggs id, params, type and schema', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.date_histogram[0];
      expect(aggConfig.id).to.be('1');
      expect(aggConfig.params).to.be.an('object');
      expect(aggConfig.type).to.be.an(AggType).and.have.property('name', 'date_histogram');
      expect(aggConfig.schema).to.be.an('object').and.have.property('name', 'segment');

      const state = aggConfig.toJSON();
      expect(state).to.have.property('id', '1');
      expect(state.params).to.be.an('object');
      expect(state).to.have.property('type', 'date_histogram');
      expect(state).to.have.property('schema', 'segment');
    });



    it('test serialization  order is identical (for visual consistency)', function () {
      const vis1 = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment'
          }
        ]
      });
      const vis2 = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            schema: 'segment',
            type: 'date_histogram'

          }
        ]
      });

      //this relies on the assumption that js-engines consistently loop over properties in insertion order.
      //most likely the case, but strictly speaking not guaranteed by the JS and JSON specifications.
      expect(JSON.stringify(vis1.aggs.toJSON()) === JSON.stringify(vis2.aggs.toJSON())).to.be(true);

    });


  });

  describe('#makeLabel', function () {
    it('uses the custom label if it is defined', function () {
      const vis = new Vis(indexPattern, {});
      const aggConfig = vis.aggs[0];
      aggConfig.params.customLabel = 'Custom label';
      const label = aggConfig.makeLabel();
      expect(label).to.be(aggConfig.params.customLabel);
    });
    it('default label should be "Count"', function () {
      const vis = new Vis(indexPattern, {});
      const aggConfig = vis.aggs[0];
      const label = aggConfig.makeLabel();
      expect(label).to.be('Count');
    });
    it('default label should be "Percentage of Count" when Vis is in percentage mode', function () {
      const vis = new Vis(indexPattern, {});
      const aggConfig = vis.aggs[0];
      aggConfig.vis.params.mode = 'percentage';
      const label = aggConfig.makeLabel();
      expect(label).to.be('Percentage of Count');
    });
    it('empty label if the Vis type is not defined', function () {
      const vis = new Vis(indexPattern, {});
      const aggConfig = vis.aggs[0];
      aggConfig.type = undefined;
      const label = aggConfig.makeLabel();
      expect(label).to.be('');
    });
  });

  describe('#fieldFormatter', function () {
    it('returns the fields format unless the agg type has a custom getFormat handler', function () {
      let vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });
      expect(vis.aggs[0].fieldFormatter()).to.be(vis.aggs[0].getField().format.getConverterFor());

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
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });

      const agg = vis.aggs[0];
      agg.params.field = { type: 'date', format: null };
      expect(agg.fieldFormatter()).to.be(fieldFormat.getDefaultInstance('string').getConverterFor());
    });

    it('returns the string format if their is no field', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_histogram',
            schema: 'segment',
            params: { field: '@timestamp' }
          }
        ]
      });

      const agg = vis.aggs[0];
      delete agg.params.field;
      expect(agg.fieldFormatter()).to.be(fieldFormat.getDefaultInstance('string').getConverterFor());
    });

    it('returns the html converter if "html" is passed in', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'avg',
            schema: 'metric',
            params: { field: 'bytes' }
          }
        ]
      });

      const field = indexPattern.fields.byName.bytes;
      expect(vis.aggs[0].fieldFormatter('html')).to.be(field.format.getConverterFor('html'));
    });
  });
});
