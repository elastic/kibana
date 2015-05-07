define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  var slices = require('vislib_fixtures/mock_data/histogram/_slices');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');
  var histogramSlices = require('vislib_fixtures/mock_data/histogram/_slices');

  var dataArray = [
    stackedSeries,
    slices,
    histogramSlices,
    stackedSeries,
    stackedSeries
  ];

  var chartTypes = [
    'histogram',
    'pie',
    'pie',
    'area',
    'line'
  ];

  var chartSelectors = {
    histogram: '.chart rect',
    pie: '.chart path',
    area: '.chart path',
    line: '.chart circle'
  };

  angular.module('LegendFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('Vislib Legend Class Test Suite for ' + chartTypes[i] + ' data', function () {
      var visLibParams = {
        type: chartTypes[i],
        addLegend: true
      };
      var Legend;
      var vis;

      beforeEach(function () {
        module('LegendFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          Legend = Private(require('components/vislib/lib/legend'));
          require('css!components/vislib/styles/main');

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('_modifyPieLabels method', function () {
        var labels = ['m', 'n', 'b', 's', 't', 'u'];
        var pieData = [{
          slices: {
            children: [
              { name: 'm', size: 20 },
              {
                name: 'n',
                size: 30,
                children: [
                  { name: 's', size: 10 },
                  { name: 't', size: 20 },
                  { name: 'u', size: 4 }
                ]
              },
              { name: 'b', size: 40 }
            ]
          }
        }];

        it('should flatten the nested objects', function () {
          var items = Legend.prototype._modifyPieLabels(pieData, labels);
          expect(items.length).to.be(6);
        });
      });

      describe('_modifyPointSeriesLabels method', function () {
        var labels = ['html', 'css', 'png'];
        var seriesData = [
          {
            series: [
              {
                label: 'html',
                values: [{y: 2}, {y: 3}, {y: 4}]
              },
              {
                label: 'css',
                values: [{y: 5}, {y: 6}, {y: 7}]
              },
              {
                label: 'png',
                values: [{y: 8}, {y: 9}, {y: 10}]
              }
            ]
          },
          {
            series: [
              {
                label: 'html',
                values: [{y: 2}, {y: 3}, {y: 4}]
              },
              {
                label: 'css',
                values: [{y: 5}, {y: 6}, {y: 7}]
              },
              {
                label: 'png',
                values: [{y: 8}, {y: 9}, {y: 10}]
              }
            ]
          }
        ];

        it('should combine values arrays of objects with identical labels', function () {
          seriesData.forEach(function (obj) {
            obj.series.forEach(function (data) {
              data.values.forEach(function (d) {
                d.aggConfigResult = {
                  $parent: {
                    $parent: undefined,
                    aggConfig: {
                      schema: {
                        group: 'bucket'
                      }
                    },
                    key: data.label,
                    type: 'bucket',
                    value: data.label
                  },
                };
              });
            });
          });

          var items = Legend.prototype._modifyPointSeriesLabels(seriesData, labels);
          expect(items.length).to.be(3);

          items.forEach(function (item) {
            expect(item.values.length).to.be(6);
          });
        });
      });

      describe('legend item label matches vis item label', function () {
        it('should match the slice label', function () {
          var chartType = chartTypes[i];
          var paths = $(vis.el).find(chartSelectors[chartType]).toArray();
          var items = vis.handler.legend.labels;

          items.forEach(function (d) {
            var path = _(paths)
            .map(function (path) {
              return path.getAttribute('data-label');
            })
            .filter(function (dataLabel) {
              return dataLabel === d;
            })
            .value();

            expect(path.length).to.be.greaterThan(0);
          });
        });
      });

      describe('header method', function () {
        it('should append the legend header', function () {
          expect($(vis.el).find('.header').length).to.be(1);
          expect($(vis.el).find('.column-labels').length).to.be(1);
        });
      });

      describe('list method', function () {
        it('should append the legend list', function () {
          expect($(vis.el).find('.legend-ul').length).to.be(1);
        });
        it('should contain a list of items', function () {
          expect($(vis.el).find('li').length).to.be.greaterThan(1);
        });
      });

      describe('render method', function () {
        it('should create a legend toggle', function () {
          expect($('.legend-toggle').length).to.be(1);
        });

        it('should have an onclick listener', function () {
          expect(!!$('.legend-toggle')[0].__onclick).to.be(true);
          expect(!!$('li.color')[0].__onclick).to.be(true);
        });

        it('should attach onmouseover listener', function () {
          expect(!!$('li.color')[0].__onmouseover).to.be(true);
        });
      });
    });
  });
});
