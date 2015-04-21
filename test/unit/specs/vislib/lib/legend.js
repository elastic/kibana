define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  var slices = require('vislib_fixtures/mock_data/histogram/_slices');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');

  var dataArray = [
    stackedSeries,
    slices,
    stackedSeries,
    stackedSeries,
  ];

  var chartTypes = [
    'histogram',
    'pie',
    'area',
    'line'
  ];

  var chartSelectors = {
    histogram: '.chart rect',
    pie: '.chart path',
    area: '.chart path',
    line: '.chart circle',
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

      describe('_transformPieData method', function () {
        var pieData = {
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
        };

        it('should flatten the nested objects', function () {
          var items = Legend.prototype._transformPieData([pieData]);
          expect(items.length).to.be(6);
        });
      });

      describe('_filterZeroInjectedValues method', function () {
        // Zero injected values do not contain aggConfigResults
        var seriesData = [
          { aggConfigResult: {} },
          { aggConfigResult: {} },
          {}
        ];

        it('should remove zero injected values', function () {
          var items = Legend.prototype._filterZeroInjectedValues(seriesData);
          expect(items.length).to.be(2);
        });
      });

      describe('_transformSeriesData method', function () {
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
          },
        ];

        it('should combine values arrays of objects with identical labels', function () {
          var items = Legend.prototype._transformSeriesData(seriesData);
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
          var items = vis.handler.legend.dataLabels;

          items.forEach(function (d) {
            var path = _(paths)
            .map(function (path) {
              return path.getAttribute('data-label');
            })
            .filter(function (dataLabel) {
              var label = d.label ? d.label : d.name;

              if (typeof label === 'number') dataLabel = +dataLabel;
              return dataLabel === label;
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
