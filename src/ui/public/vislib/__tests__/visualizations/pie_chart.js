import d3 from 'd3';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import 'ui/persisted_state';
import pieData from 'fixtures/vislib/mock_data/pie/_histogram';

const sizes = [
  0,
  5,
  15,
  30,
  60,
  120
];

describe('No global chart settings', function () {
  const visLibParams = {
    el: $('<div class=chart1></div>'),
    type: 'pie',
    addLegend: true,
    addTooltip: true
  };
  let vis;
  let persistedState;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    vis = Private(FixturesVislibVisFixtureProvider)(visLibParams);
    persistedState = new ($injector.get('PersistedState'))();
    vis.on('brush', _.noop);
    vis.render(pieData, persistedState);
  }));

  afterEach(function () {
    vis.destroy();
  });

  it('should render chart titles for all charts', function () {
    expect($(vis.el).find('.x-axis-chart-title').length).to.be(1);
  });

  describe('_validatePieData method', function () {
    const allZeros = [
      { children: [] },
      { children: [] },
      { children: [] }
    ];

    const someZeros = [
      { children: [{}] },
      { children: [{}] },
      { children: [] }
    ];

    const noZeros = [
      { children: [{}] },
      { children: [{}] },
      { children: [{}] }
    ];

    it('should throw an error when all charts contain zeros', function () {
      expect(function () {
        vis.handler.ChartClass.prototype._validatePieData(allZeros);
      }).to.throwError();
    });

    it('should not throw an error when only some or no charts contain zeros', function () {
      expect(function () {
        vis.handler.ChartClass.prototype._validatePieData(someZeros);
      }).to.not.throwError();
      expect(function () {
        vis.handler.ChartClass.prototype._validatePieData(noZeros);
      }).to.not.throwError();
    });

    describe('addPathEvents method', function () {
      let path;
      let d3selectedPath;
      let onClick;
      let onMouseOver;

      beforeEach(function () {
        vis.handler.charts.forEach(function (chart) {
          path = $(chart.chartEl).find('path')[0];
          d3selectedPath = d3.select(path)[0][0];

          // d3 instance of click and hover
          onClick = (!!d3selectedPath.__onclick);
          onMouseOver = (!!d3selectedPath.__onmouseover);
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
      let width;
      let height;
      let svg;
      let slices;

      beforeEach(ngMock.inject(function () {
        vis.handler.charts.forEach(function (chart) {
          width = $(chart.chartEl).width();
          height = $(chart.chartEl).height();
          svg = d3.select($(chart.chartEl).find('svg')[0]);
          slices = chart.chartData;
        });
      }));

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
