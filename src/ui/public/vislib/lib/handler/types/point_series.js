define(function (require) {
  return function ColumnHandler(Private) {
    let injectZeros = Private(require('ui/vislib/components/zero_injection/inject_zeros'));
    let Handler = Private(require('ui/vislib/lib/handler/handler'));
    let Data = Private(require('ui/vislib/lib/data'));
    let XAxis = Private(require('ui/vislib/lib/x_axis'));
    let YAxis = Private(require('ui/vislib/lib/y_axis'));
    let AxisTitle = Private(require('ui/vislib/lib/axis_title'));
    let ChartTitle = Private(require('ui/vislib/lib/chart_title'));
    let Alerts = Private(require('ui/vislib/lib/alerts'));

    /*
     * Create handlers for Area, Column, and Line charts which
     * are all nearly the same minus a few details
     */
    function create(opts) {
      opts = opts || {};

      return function (vis) {
        let isUserDefinedYAxis = vis._attr.setYExtents;
        let data;

        if (opts.zeroFill) {
          data = new Data(injectZeros(vis.data), vis._attr, vis.uiState);
        } else {
          data = new Data(vis.data, vis._attr, vis.uiState);
        }

        return new Handler(vis, {
          data: data,
          axisTitle: new AxisTitle(vis.el, data.get('xAxisLabel'), data.get('yAxisLabel')),
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
            _attr: vis._attr
          })
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
});
