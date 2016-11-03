import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import d3 from 'd3';

// Data
import series from 'fixtures/vislib/mock_data/date_histogram/_series';
import seriesPosNeg from 'fixtures/vislib/mock_data/date_histogram/_series_pos_neg';
import seriesNeg from 'fixtures/vislib/mock_data/date_histogram/_series_neg';
import termsColumns from 'fixtures/vislib/mock_data/terms/_columns';
//const histogramRows = require('fixtures/vislib/mock_data/histogram/_rows');
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';

// tuple, with the format [description, mode, data]
const dataTypesArray = [
  ['series', 'stacked', series],
  ['series with positive and negative values', 'stacked', seriesPosNeg],
  ['series with negative values', 'stacked', seriesNeg],
  ['terms columns', 'grouped', termsColumns],
  // ['histogram rows', 'percentage', histogramRows],
  ['stackedSeries', 'stacked', stackedSeries],
];

dataTypesArray.forEach(function (dataType, i) {
  const name = dataType[0];
  const mode = dataType[1];
  const data = dataType[2];

  describe('Vislib Column Chart Test Suite for ' + name + ' Data', function () {
    let vis;
    let persistedState;
    const visLibParams = {
      type: 'histogram',
      hasTimeField: true,
      addLegend: true,
      addTooltip: true,
      mode: mode,
      zeroFill: true
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

    describe('mapData method', function () {
      let stackedData;
      let isStacked;

      beforeEach(function () {
        vis.handler.charts.forEach(function (chart) {
          stackedData = chart.mapData(chart.chartData, chart);

          isStacked = stackedData.every(function (arr) {
            return arr.every(function (d) {
              return _.isNumber(d.y0);
            });
          });
        });
      });

      it('should append a d.y0 key to the data object', function () {
        expect(isStacked).to.be(true);
      });
    });

    describe('addBars method', function () {
      it('should append rects', function () {
        let numOfSeries;
        let numOfValues;
        let product;

        vis.handler.charts.forEach(function (chart) {
          numOfSeries = chart.chartData.series.length;
          numOfValues = chart.chartData.series[0].values.length;
          product = numOfSeries * numOfValues;
          expect($(chart.chartEl).find('.series rect')).to.have.length(product);
        });
      });
    });

    describe('updateBars method', function () {
      beforeEach(function () {
        vis.handler.visConfig.set('mode', 'grouped');
        vis.render(vis.data, persistedState);
      });

      it('should returned grouped bars', function () {
        vis.handler.charts.forEach(function (chart) {});
      });
    });

    describe('addBarEvents method', function () {
      function checkChart(chart) {
        const rect = $(chart.chartEl).find('.series rect').get(0);

        // check for existance of stuff and things
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

      it('should render a zero axis line', function () {
        vis.handler.charts.forEach(function (chart) {
          const yAxis = chart.handler.valueAxes[0];

          if (yAxis.yMin < 0 && yAxis.yMax > 0) {
            expect($(chart.chartEl).find('line.zero-line').length).to.be(1);
          }
        });
      });
    });

    describe('containerTooSmall error', function () {
      beforeEach(function () {
        $(vis.el).height(0);
        $(vis.el).width(0);
      });

      it('should throw an error', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(function () {
            chart.render();
          }).to.throwError();
        });
      });
    });

    describe('defaultYExtents is true', function () {
      beforeEach(function () {
        vis.visConfig.set('defaultYExtents', true);
        vis.render(data, persistedState);
      });

      it('should return yAxis extents equal to data extents', function () {
        vis.handler.charts.forEach(function (chart) {
          const yAxis = chart.handler.valueAxes[0];
          const min = vis.handler.valueAxes[0].axisScale.getYMin();
          const max = vis.handler.valueAxes[0].axisScale.getYMax();
          const domain = yAxis.getScale().domain();
          expect(domain[0]).to.equal(min);
          expect(domain[1]).to.equal(max);
        });
      });
    });
  });
});
