import ngMock from 'ng_mock';
import expect from 'expect.js';
import { BasicResponseHandlerProvider } from '../../response_handlers/basic';
import { VisProvider } from '../..';
import fixtures from 'fixtures/fake_hierarchical_data';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

const rowAgg = [
  { id: 'agg_1', type: 'avg', schema: 'metric', params: { field: 'bytes' } },
  { id: 'agg_2', type: 'terms', schema: 'split', params: { field: 'extension', rows: true } },
  { id: 'agg_3', type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
  { id: 'agg_4', type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
];


describe('Basic Response Handler', function () {
  let basicResponseHandler;
  let indexPattern;
  let Vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    basicResponseHandler = Private(BasicResponseHandlerProvider).handler;
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  it('calls hierarchical converter if isHierarchical is set to true', () => {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: rowAgg
    });
    basicResponseHandler(vis, fixtures.threeTermBuckets).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows[0].slices).to.not.be.an('undefined');
      expect(data.rows[0].series).to.be.an('undefined');
    });
  });

  it('returns empty object if conversion failed', () => {
    basicResponseHandler({}, {}).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows).to.equal([]);
    });
  });

  it('returns converted data', () => {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: rowAgg.slice(0, 3)
    });
    basicResponseHandler(vis, fixtures.threeTermBuckets).then(data => {
      expect(data).to.not.be.an('undefined');
      expect(data.rows[0].slices).to.be.an('undefined');
      expect(data.rows[0].series).to.not.be.an('undefined');
    });
  });

});
