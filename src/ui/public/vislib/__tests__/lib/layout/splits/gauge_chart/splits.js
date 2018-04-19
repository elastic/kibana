import d3 from 'd3';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';
import VislibLibLayoutSplitsGaugeChartChartSplitProvider from '../../../../../lib/layout/splits/gauge_chart/chart_split';
import VislibLibLayoutSplitsGaugeChartChartTitleSplitProvider from '../../../../../lib/layout/splits/gauge_chart/chart_title_split';

describe('Vislib Gauge Split Function Test Suite', function () {
  describe('Column Chart', function () {
    let chartSplit;
    let chartTitleSplit;
    let el;
    const data = {
      rows: [
        {
          hits: 621,
          label: '',
          ordered: {
            date: true,
            interval: 30000,
            max: 1408734982458,
            min: 1408734082458
          },
          series: [
            {
              values: [
                {
                  x: 1408734060000,
                  y: 8
                },
                {
                  x: 1408734090000,
                  y: 23
                },
                {
                  x: 1408734120000,
                  y: 30
                },
                {
                  x: 1408734150000,
                  y: 28
                },
                {
                  x: 1408734180000,
                  y: 36
                },
                {
                  x: 1408734210000,
                  y: 30
                },
                {
                  x: 1408734240000,
                  y: 26
                },
                {
                  x: 1408734270000,
                  y: 22
                },
                {
                  x: 1408734300000,
                  y: 29
                },
                {
                  x: 1408734330000,
                  y: 24
                }
              ]
            }
          ],
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count'
        },
        {
          hits: 621,
          label: '',
          ordered: {
            date: true,
            interval: 30000,
            max: 1408734982458,
            min: 1408734082458
          },
          series: [
            {
              values: [
                {
                  x: 1408734060000,
                  y: 8
                },
                {
                  x: 1408734090000,
                  y: 23
                },
                {
                  x: 1408734120000,
                  y: 30
                },
                {
                  x: 1408734150000,
                  y: 28
                },
                {
                  x: 1408734180000,
                  y: 36
                },
                {
                  x: 1408734210000,
                  y: 30
                },
                {
                  x: 1408734240000,
                  y: 26
                },
                {
                  x: 1408734270000,
                  y: 22
                },
                {
                  x: 1408734300000,
                  y: 29
                },
                {
                  x: 1408734330000,
                  y: 24
                }
              ]
            }
          ],
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count'
        }
      ]
    };

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      chartSplit = Private(VislibLibLayoutSplitsGaugeChartChartSplitProvider);
      chartTitleSplit = Private(VislibLibLayoutSplitsGaugeChartChartTitleSplitProvider);

      el = d3.select('body').append('div')
        .attr('class', 'visualization')
        .datum(data);
    }));

    afterEach(function () {
      el.remove();
    });

    describe('chart split function', function () {
      let fixture;

      beforeEach(ngMock.inject(function () {
        fixture = d3.select('.visualization').call(chartSplit);
      }));

      afterEach(function () {
        fixture.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.chart').length).to.be(2);
      });

      it('should add the correct class name', function () {
        expect(!!$('.chart-wrapper-row').length).to.be(true);
      });
    });

    describe('chart title split function', function () {
      let visEl;

      beforeEach(ngMock.inject(function () {
        visEl = el.append('div').attr('class', 'vis-wrapper');
        visEl.append('div').attr('class', 'x-axis-chart-title');
        visEl.append('div').attr('class', 'y-axis-chart-title');
        visEl.select('.x-axis-chart-title').call(chartTitleSplit);
        visEl.select('.y-axis-chart-title').call(chartTitleSplit);

      }));

      afterEach(function () {
        visEl.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.x-axis-chart-title .chart-title').length).to.be(2);
        expect($('.y-axis-chart-title .chart-title').length).to.be(2);
      });


    });

  });
});
