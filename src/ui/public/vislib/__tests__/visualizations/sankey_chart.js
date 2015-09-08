var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');
var fixtures = require('fixtures/fake_hierarchical_data');

var sliceAgg = [
  { type: 'count', schema: 'metric' },
  { type: 'terms', schema: 'segment', params: { field: 'extension' }},
  { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
  { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
];

describe('Vislib SankeyChart Class Test Suite for slice data', function () {
  var visLibParams = {
    type: 'sankey'
  };
  var vis;
  var Vis;
  var indexPattern;
  var buildSankey;
  var data;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    vis = Private(require('fixtures/vislib/_vis_fixture'))(visLibParams);
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    buildSankey = Private(require('ui/agg_response/sankey/sankey'));

    var id = 1;
    var stubVis = new Vis(indexPattern, {
      type: 'sankey',
      aggs: sliceAgg
    });

    _.each(stubVis.aggs, function (agg) { agg.id = 'agg_' + id++; });

    data = buildSankey(stubVis, fixtures.threeTermBuckets);

    vis.render(data);
  }));

  afterEach(function () {
    $(vis.el).remove();
    vis = null;
  });

  describe('draw method', function () {
    it('should return a function', function () {
      vis.handler.charts.forEach(function (chart) {
        expect(_.isFunction(chart.draw())).to.be(true);
      });
    });
  });

});
