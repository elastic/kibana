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
    { type: 'terms', schema: 'split', params: { field: 'extension', row: false }},
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

  var sizes = [
    0,
    5,
    15,
    30,
    60,
    120
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
      var data;

      beforeEach(function () {
        module('PieChartFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
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

          data = buildHierarchicalData(stubVis, fixtures.threeTermBuckets);

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('addPathEvents method', function () {
        var path;
        var d3selectedPath;
        var onClick;
        var onMouseOver;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {
              path = $(chart.chartEl).find('path')[0];
              d3selectedPath = d3.select(path)[0][0];

              // d3 instance of click and hover
              onClick = (!!d3selectedPath.__onclick);
              onMouseOver = (!!d3selectedPath.__onmouseover);
            });
          });
        });

        it('should attach a click event', function () {
          vis.handler.charts.forEach(function () {
            expect(onClick).to.be(true);
          });
        });

        it('should attach a hover event', function () {
          vis.handler.charts.forEach(function () {
            expect(onMouseOver).to.be(true);
          });
        });
      });

      describe('addPath method', function () {
        var width;
        var height;
        var svg;
        var slices;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {
              width = $(chart.chartEl).width();
              height = $(chart.chartEl).height();
              svg = d3.select($(chart.chartEl).find('svg')[0]);
              slices = chart.chartData.slices;
            });
          });
        });

        it('should return an SVG object', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isObject(chart.addPath(width, height, svg, slices))).to.be(true);
          });
        });

        it('should draw path elements', function () {
          vis.handler.charts.forEach(function (chart) {

            // test whether path elements are drawn
            expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
          });
        });
      });

      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });
      });

      sizes.forEach(function (size) {
        describe('containerTooSmall error', function () {
          it('should throw an error', function () {
            // 20px is the minimum height and width
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size < 20) {
                expect(function () {
                  chart.render();
                }).to.throwError();
              }
            });
          });

          it('should not throw an error', function () {
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size > 20) {
                expect(function () {
                  chart.render();
                }).to.not.throwError();
              }
            });
          });
        });
      });

    });
  });
});
