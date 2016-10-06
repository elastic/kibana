import d3 from 'd3';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VislibVisProvider from 'ui/vislib/vis';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';
import VislibVisualizationsPieChartProvider from 'ui/vislib/visualizations/pie_chart';
import VislibVisualizationsChartProvider from 'ui/vislib/visualizations/_chart';

describe('Vislib _chart Test Suite', function () {
  let PieChart;
  let Chart;
  let Data;
  let persistedState;
  let Vis;
  const chartData = {};
  let vis;
  let el;
  let myChart;
  let config;
  const data = {
    hits      : 621,
    label     : '',
    ordered   : {
      date: true,
      interval: 30000,
      max     : 1408734982458,
      min     : 1408734082458
    },
    series    : [
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
    tooltipFormatter: function (datapoint) {
      return datapoint;
    },
    xAxisFormatter: function (thing) {
      return thing;
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VislibVisProvider);
    Data = Private(VislibLibDataProvider);
    persistedState = new (Private(PersistedStatePersistedStateProvider))();
    PieChart = Private(VislibVisualizationsPieChartProvider);
    Chart = Private(VislibVisualizationsChartProvider);

    el = d3.select('body').append('div').attr('class', 'column-chart');

    config = {
      type: 'histogram',
      addTooltip: true,
      addLegend: true,
      hasTimeField: true,
      zeroFill: true
    };

    vis = new Vis(el[0][0], config);
    vis.render(data, persistedState);

    myChart = vis.handler.charts[0];
  }));

  afterEach(function () {
    el.remove();
    vis.destroy();
  });

  it('should be a constructor for visualization modules', function () {
    expect(myChart instanceof Chart).to.be(true);
  });

  it('should have a render method', function () {
    expect(typeof myChart.render === 'function').to.be(true);
  });

  it('should destroy the chart element', function () {
    // Once destroy is called, a chart should not be able to be drawn
    myChart.destroy();

    expect(function () {
      myChart.render();
    }).to.throwError();
  });

});
