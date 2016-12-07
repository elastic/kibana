import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import d3 from 'd3';

// Data
import series from 'fixtures/vislib/mock_data/date_histogram/_series';
import seriesPosNeg from 'fixtures/vislib/mock_data/date_histogram/_series_pos_neg';
import seriesNeg from 'fixtures/vislib/mock_data/date_histogram/_series_neg';
import termsColumns from 'fixtures/vislib/mock_data/terms/_columns';
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';

// tuple, with the format [description, mode, data]
const dataTypesArray = [
  ['series', series],
  ['series with positive and negative values', seriesPosNeg],
  ['series with negative values', seriesNeg],
  ['terms columns', termsColumns],
  ['stackedSeries', stackedSeries],
];

describe('Vislib Heatmap Cyart Test Suite', function () {
  dataTypesArray.forEach(function (dataType, i) {
    const name = dataType[0];
    const data = dataType[1];

    describe('for ' + name + ' Data', function () {
      let vis;
      let persistedState;
      const visLibParams = {
        type: 'heatmap',
        addLegend: true,
        addTooltip: true,
        colorsNumber: 4,
        colorSchema: 'yellow to red',
      };

      beforeEach(ngMock.module('kibana'));
      beforeEach(ngMock.inject(function (Private) {
        vis = Private(FixturesVislibVisFixtureProvider)(visLibParams);
        persistedState = new (Private(PersistedStatePersistedStateProvider))();
        vis.on('brush', _.noop);
        vis.render(data, persistedState);
      }));

      afterEach(function () {
        vis.destroy();
      });

      describe('addSquares method', function () {
        it('should append rects', function () {
          let numOfSeries;
          let numOfValues;
          let product;

          vis.handler.charts.forEach(function (chart) {
            const numOfRects = chart.chartData.series.reduce((result, series) => {
              return result + series.values.length;
            }, 0);
            expect($(chart.chartEl).find('.series rect')).to.have.length(numOfRects);
          });
        });
      });

      describe('addBarEvents method', function () {
        function checkChart(chart) {
          const rect = $(chart.chartEl).find('.series rect').get(0);

          return {
            click: !!rect.__onclick,
            mouseOver: !!rect.__onmouseover,
            // D3 brushing requires that a g element is appended that
            // listens for mousedown events. This g element includes
            // listeners, however, I was not able to test for the listener
            // function being present. I will need to update this test
            // in the future.
            brush: !!d3.select('.brush')[0][0]
          };
        }

        it('should attach the brush if data is a set of ordered dates', function () {
          vis.handler.charts.forEach(function (chart) {
            const has = checkChart(chart);
            const ordered = vis.handler.data.get('ordered');
            const date = Boolean(ordered && ordered.date);
            expect(has.brush).to.be(date);
          });
        });

        it('should attach a click event', function () {
          vis.handler.charts.forEach(function (chart) {
            const has = checkChart(chart);
            expect(has.click).to.be(true);
          });
        });

        it('should attach a hover event', function () {
          vis.handler.charts.forEach(function (chart) {
            const has = checkChart(chart);
            expect(has.mouseOver).to.be(true);
          });
        });
      });

      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });

        it('should return a yMin and yMax', function () {
          vis.handler.charts.forEach(function (chart) {
            const yAxis = chart.handler.valueAxes[0];
            const domain = yAxis.getScale().domain();

            expect(domain[0]).to.not.be(undefined);
            expect(domain[1]).to.not.be(undefined);
          });
        });
      });
    });
  });
});
