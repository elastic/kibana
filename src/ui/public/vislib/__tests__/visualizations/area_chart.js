import d3 from 'd3';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';

import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import 'ui/persisted_state';
const dataTypesArray = {
  'series pos': require('fixtures/vislib/mock_data/date_histogram/_series'),
  'series pos neg': require('fixtures/vislib/mock_data/date_histogram/_series_pos_neg'),
  'series neg': require('fixtures/vislib/mock_data/date_histogram/_series_neg'),
  'term columns': require('fixtures/vislib/mock_data/terms/_columns'),
  'range rows': require('fixtures/vislib/mock_data/range/_rows'),
  'stackedSeries': require('fixtures/vislib/mock_data/date_histogram/_stacked_series')
};

const visLibParams = {
  type: 'area',
  addLegend: true,
  addTooltip: true,
  mode: 'stacked'
};


_.forOwn(dataTypesArray, function (dataType, dataTypeName) {
  describe('Vislib Area Chart Test Suite for ' + dataTypeName + ' Data', function () {
    let vis;
    let persistedState;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, $injector) {
      vis = Private(FixturesVislibVisFixtureProvider)(visLibParams);
      persistedState = new ($injector.get('PersistedState'))();
      vis.on('brush', _.noop);
      vis.render(dataType, persistedState);
    }));

    afterEach(function () {
      vis.destroy();
    });

    describe('stackData method', function () {
      let stackedData;
      let isStacked;

      beforeEach(function () {
        vis.handler.charts.forEach(function (chart) {
          stackedData = chart.chartData;

          isStacked = stackedData.series.every(function (arr) {
            return arr.values.every(function (d) {
              return _.isNumber(d.y0);
            });
          });
        });
      });

      it('should append a d.y0 key to the data object', function () {
        expect(isStacked).to.be(true);
      });
    });

    describe('addPath method', function () {
      it('should append a area paths', function () {
        vis.handler.charts.forEach(function (chart) {
          expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
        });
      });
    });

    describe('addPathEvents method', function () {
      let path;
      let d3selectedPath;
      let onMouseOver;

      beforeEach(ngMock.inject(function () {
        vis.handler.charts.forEach(function (chart) {
          path = $(chart.chartEl).find('path')[0];
          d3selectedPath = d3.select(path)[0][0];

          // d3 instance of click and hover
          onMouseOver = (!!d3selectedPath.__onmouseover);
        });
      }));

      it('should attach a hover event', function () {
        vis.handler.charts.forEach(function () {
          expect(onMouseOver).to.be(true);
        });
      });
    });

    describe('addCircleEvents method', function () {
      let circle;
      let brush;
      let d3selectedCircle;
      let onBrush;
      let onClick;
      let onMouseOver;

      beforeEach(ngMock.inject(function () {
        vis.handler.charts.forEach(function (chart) {
          circle = $(chart.chartEl).find('circle')[0];
          brush = $(chart.chartEl).find('.brush');
          d3selectedCircle = d3.select(circle)[0][0];

          // d3 instance of click and hover
          onBrush = (!!brush);
          onClick = (!!d3selectedCircle.__onclick);
          onMouseOver = (!!d3selectedCircle.__onmouseover);
        });
      }));

      // D3 brushing requires that a g element is appended that
      // listens for mousedown events. This g element includes
      // listeners, however, I was not able to test for the listener
      // function being present. I will need to update this test
      // in the future.
      it('should attach a brush g element', function () {
        vis.handler.charts.forEach(function () {
          expect(onBrush).to.be(true);
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

    describe('addCircles method', function () {
      it('should append circles', function () {
        vis.handler.charts.forEach(function (chart) {
          expect($(chart.chartEl).find('circle').length).to.be.greaterThan(0);
        });
      });

      it('should not draw circles where d.y === 0', function () {
        vis.handler.charts.forEach(function (chart) {
          const series = chart.chartData.series;
          const isZero = series.some(function (d) {
            return d.y === 0;
          });
          const circles = $.makeArray($(chart.chartEl).find('circle'));
          const isNotDrawn = circles.some(function (d) {
            return d.__data__.y === 0;
          });

          if (isZero) {
            expect(isNotDrawn).to.be(false);
          }
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

    describe('defaultYExtents is true', function () {
      beforeEach(function () {
        vis.visConfigArgs.defaultYExtents = true;
        vis.render(dataType, persistedState);
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
