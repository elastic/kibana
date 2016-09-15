import d3 from 'd3';
import _ from 'lodash';
import VislibComponentsZeroInjectionInjectZerosProvider from 'ui/vislib/components/zero_injection/inject_zeros';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import VislibLibChartTitleProvider from 'ui/vislib/lib/chart_title';
import VislibLibAlertsProvider from 'ui/vislib/lib/alerts';
import VislibAxis from 'ui/vislib/lib/axis';

export default function ColumnHandler(Private) {
  const injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
  const Handler = Private(VislibLibHandlerHandlerProvider);
  const Data = Private(VislibLibDataProvider);
  const Axis = Private(VislibAxis);
  const ChartTitle = Private(VislibLibChartTitleProvider);
  const Alerts = Private(VislibLibAlertsProvider);

  function getData(vis, opts) {
    if (opts.zeroFill) {
      return new Data(injectZeros(vis.data), vis._attr, vis.uiState);
    } else {
      return new Data(vis.data, vis._attr, vis.uiState);
    }
  }
  /*
   * Create handlers for Area, Column, and Line charts which
   * are all nearly the same minus a few details
   */
  function create(opts) {
    opts = opts || {};

    return function (vis) {
      const isUserDefinedYAxis = vis._attr.setYExtents;
      const data = getData(vis, opts);

      return new Handler(vis, {
        data: data,
        chartTitle: new ChartTitle(vis.el),
        categoryAxes: [
          new Axis({
            id: 'CategoryAxis-1',
            type: 'category',
            vis: vis,
            data: data,
            labels: {
              axisFormatter: data.data.xAxisFormatter
            },
            scale: {
              expandLastBucket: opts.expandLastBucket
            },
            title: {
              text: data.get('xAxisLabel')
            }
          })
        ],
        alerts: new Alerts(vis, data, opts.alerts),
        valueAxes:  [
          new Axis({
            id: 'ValueAxis-1',
            type: 'value',
            vis: vis,
            data: data,
            scale: {
              type: vis._attr.scale,
              setYExtents: vis._attr.setYExtents,
              defaultYExtents: vis._attr.defaultYExtents,
              min : isUserDefinedYAxis ? vis._attr.yAxis.min : undefined,
              max : isUserDefinedYAxis ? vis._attr.yAxis.max : undefined,
            },
            labels: {
              axisFormatter: data.data.yAxisFormatter,
            },
            title: {
              text: data.get('yAxisLabel')
            }
          })
        ]
      });

    };
  }

  return {
    line: create(),

    column: create({
      zeroFill: true,
      expandLastBucket: true
    }),

    area: create({
      zeroFill: true,
      alerts: [
        {
          type: 'warning',
          msg: 'Positive and negative values are not accurately represented by stacked ' +
               'area charts. Either changing the chart mode to "overlap" or using a ' +
               'bar chart is recommended.',
          test: function (vis, data) {
            if (!data.shouldBeStacked() || data.maxNumberOfSeries() < 2) return;

            const hasPos = data.getYMax(data._getY) > 0;
            const hasNeg = data.getYMin(data._getY) < 0;
            return (hasPos && hasNeg);
          }
        },
        {
          type: 'warning',
          msg: 'Parts of or the entire area chart might not be displayed due to null ' +
          'values in the data. A line chart is recommended when displaying data ' +
          'with null values.',
          test: function (vis, data) {
            return data.hasNullValues();
          }
        }
      ]
    })
  };
};
