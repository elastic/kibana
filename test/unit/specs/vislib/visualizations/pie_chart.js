define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var fixtures = require('fixtures/fake_hierarchical_data');

  angular.module('PieChartFactory', ['kibana']);

  var rowAgg = [
    { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
    { type: 'terms', schema: 'split', params: { field: 'extension', rows: true }},
    { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
    { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
  ];

  var colAgg = [
    { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
    { type: 'terms', schema: 'split', params: { field: 'extension' }},
    { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
    { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
  ];

  var sliceAgg = [
    { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
    { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
    { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
  ];

  var aggArray = [
    rowAgg,
    colAgg,
    sliceAgg
  ];

  var names = [
    'rows',
    'columns',
    'slices'
  ];

  aggArray.forEach(function (dataAgg, i) {
    describe('Vislib PieChart Class Test Suite for ' + names[i] + ' data', function () {
      var visLibParams = {
        type: 'pie',
        addLegend: true,
        addTooltip: true
      };
      var vis;
      var Vis;
      var indexPattern;
      var buildHierarchicalData;

      beforeEach(function () {
        module('PieChartFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          vis = Private(require('vislib_fixtures/vis_fixture'))(visLibParams);
          Vis = Private(require('components/vis/vis'));
          indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
          buildHierarchicalData = Private(require('components/agg_response/hierarchical/build_hierarchical_data'));
          require('css!components/vislib/styles/main');

          var id = 1;
          var stubVis = new Vis(indexPattern, {
            type: 'pie',
            aggs: dataAgg
          });

          // We need to set the aggs to a known value.
          _.each(stubVis.aggs, function (agg) { agg.id = 'agg_' + id++; });

          var data = buildHierarchicalData(stubVis, fixtures.threeTermBuckets);
          console.log(data);

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('addPathEvents method', function () {});
      describe('addPath method', function () {});
      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });
      });
    });
  });
});
