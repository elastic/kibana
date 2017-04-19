import d3 from 'd3';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';
import 'ui/persisted_state';
import { VislibLibAxisProvider } from 'ui/vislib/lib/axis';
import { VislibVisConfigProvider } from 'ui/vislib/lib/vis_config';

describe('Vislib Axis Class Test Suite', function () {
  let Axis;
  let persistedState;
  let yAxis;
  let el;
  let fixture;
  let VisConfig;
  let seriesData;

  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458
    },
    series: [
      {
        label: 'Count',
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
            x: 1408734130000,
            y: 30
          },
          {
            x: 1408734150000,
            y: 28
          }
        ]
      },
      {
        label: 'Count2',
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
            x: 1408734140000,
            y: 30
          },
          {
            x: 1408734150000,
            y: 28
          }
        ]
      }
    ],
    xAxisFormatter: function (thing) {
      return new Date(thing);
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    persistedState = new ($injector.get('PersistedState'))();
    Axis = Private(VislibLibAxisProvider);
    VisConfig = Private(VislibVisConfigProvider);

    el = d3.select('body').append('div')
      .attr('class', 'x-axis-wrapper')
      .style('height', '40px');

    fixture = el.append('div')
      .attr('class', 'x-axis-div');

    const visConfig = new VisConfig({
      type: 'histogram'
    }, data, persistedState, $('.x-axis-div')[0]);
    yAxis = new Axis(visConfig, {
      type: 'value',
      id: 'ValueAxis-1'
    });

    seriesData = data.series.map(series => {
      return series.values;
    });
  }));

  afterEach(function () {
    fixture.remove();
    el.remove();
  });

  describe('_stackNegAndPosVals Method', function () {

    it('should correctly stack positive values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 23
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28
        }
      ];
      const stackedData = yAxis._stackNegAndPosVals(seriesData);
      expect(stackedData[1]).to.eql(expectedResult);
    });

    it('should correctly stack pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 0
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 0
        }
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach(value => {
        value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).to.eql(expectedResult);
    });

    it('should correctly stack mixed pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28
        }
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach((value, i) => {
        if ((i % 2) === 1) value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).to.eql(expectedResult);
    });

  });
});
