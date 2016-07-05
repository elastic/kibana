import VislibComponentsZeroInjectionInjectZerosProvider from 'ui/vislib/components/zero_injection/inject_zeros';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import VislibLibXAxisProvider from 'ui/vislib/lib/x_axis';
import VislibLibYAxisProvider from 'ui/vislib/lib/y_axis';
import VislibLibAxisTitleProvider from 'ui/vislib/lib/axis_title';
import VislibLibChartTitleProvider from 'ui/vislib/lib/chart_title';
import VislibLibAlertsProvider from 'ui/vislib/lib/alerts';
import VislibLibSingleAxisStrategy from 'ui/vislib/lib/single_y_axis_strategy';
import VislibLibDualAxisStrategy from 'ui/vislib/lib/dual_y_axis_strategy';

export default function ColumnHandler(Private) {
  let injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
  let Handler = Private(VislibLibHandlerHandlerProvider);
  let Data = Private(VislibLibDataProvider);
  let XAxis = Private(VislibLibXAxisProvider);
  let YAxis = Private(VislibLibYAxisProvider);
  let AxisTitle = Private(VislibLibAxisTitleProvider);
  let ChartTitle = Private(VislibLibChartTitleProvider);
  let Alerts = Private(VislibLibAlertsProvider);
  let SingleYAxisStrategy = Private(VislibLibSingleAxisStrategy);
  let DualYAxisStrategy = Private(VislibLibDualAxisStrategy);

  /*
   * Create handlers for Area, Column, and Line charts which
   * are all nearly the same minus a few details
   */
  function create(opts) {
    opts = opts || {};

    return function (vis) {
      let isUserDefinedYAxis = vis._attr.setYExtents;
      let data;
      let yAxisStrategy = vis.get('hasSecondaryYAxis') ? new DualYAxisStrategy() : new SingleYAxisStrategy();
      let secondaryYAxis;
      let axisTitle;

      if (opts.zeroFill) {
        data = new Data(injectZeros(vis.data), vis._attr, vis.uiState, yAxisStrategy);
      } else {
        data = new Data(vis.data, vis._attr, vis.uiState, yAxisStrategy);
      }

      if (vis.get('hasSecondaryYAxis')) {
        secondaryYAxis = new YAxis({
          el    : vis.el,
          yMin : isUserDefinedYAxis ? vis._attr.secondaryYAxis.min : data.getSecondYMin(),
          yMax : isUserDefinedYAxis ? vis._attr.secondaryYAxis.max : data.getSecondYMax(),
          yAxisFormatter: data.get('secondYAxisFormatter'),
          _attr: vis._attr,
          orientation: 'right',
          yAxisDiv: 'secondary-y-axis-div'
        });
        axisTitle = new AxisTitle(vis.el, data.get('xAxisLabel'), data.get('yAxisLabel'), data.get('secondYAxisLabel'));
      } else {
        secondaryYAxis = new YAxis({});
        axisTitle = new AxisTitle(vis.el, data.get('xAxisLabel'), data.get('yAxisLabel'));
      }

      return new Handler(vis, {
        data: data,
        axisTitle: axisTitle,
        chartTitle: new ChartTitle(vis.el),
        xAxis: new XAxis({
          el                : vis.el,
          xValues           : data.xValues(),
          ordered           : data.get('ordered'),
          xAxisFormatter    : data.get('xAxisFormatter'),
          expandLastBucket  : opts.expandLastBucket,
          _attr             : vis._attr
        }),
        alerts: new Alerts(vis, data, opts.alerts),
        yAxis: new YAxis({
          el   : vis.el,
          yMin : isUserDefinedYAxis ? vis._attr.yAxis.min : data.getYMin(),
          yMax : isUserDefinedYAxis ? vis._attr.yAxis.max : data.getYMax(),
          yAxisFormatter: data.get('yAxisFormatter'),
          _attr: vis._attr,
          orientation: 'left',
          yAxisDiv: 'y-axis-div'
        }),
        secondaryYAxis: secondaryYAxis
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

            let hasPos = data.getYMax(data._getY) > 0;
            let hasNeg = data.getYMin(data._getY) < 0;
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
