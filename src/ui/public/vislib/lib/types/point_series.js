import _ from 'lodash';

export default function ColumnHandler(Private) {
  /*
   * Create handlers for Area, Column, and Line charts which
   * are all nearly the same minus a few details
   */
  function create(opts) {
    opts = opts || {};

    return function (cfg, data) {
      const isUserDefinedYAxis = cfg.setYExtents;
      const config = _.defaults({}, cfg, {
        chartTitle: {}
      }, opts);

      config.type = 'point_series';

      if (!config.valueAxes) {
        config.valueAxes = [
          {
            id: 'ValueAxis-1',
            type: 'value',
            scale: {
              type: config.scale,
              setYExtents: config.setYExtents,
              defaultYExtents: config.defaultYExtents,
              min : isUserDefinedYAxis ? config.yAxis.min : undefined,
              max : isUserDefinedYAxis ? config.yAxis.max : undefined,
              mode : config.mode
            },
            labels: {
              axisFormatter: data.data.yAxisFormatter || data.get('yAxisFormatter')
            },
            title: {
              text: data.get('yAxisLabel')
            }
          }
        ];
      }

      if (!config.categoryAxes) {
        config.categoryAxes = [
          {
            id: 'CategoryAxis-1',
            type: 'category',
            ordered: data.ordered,
            labels: {
              axisFormatter: data.data.xAxisFormatter || data.get('xAxisFormatter')
            },
            scale: {
              expandLastBucket: opts.expandLastBucket
            },
            title: {
              text: data.get('xAxisLabel')
            }
          }
        ];
      }

      if (!config.chart) {
        const series = (data.data.rows || data.data.columns || [data.data])[0].series;
        config.chart = {
          type: 'point_series',
          series: _.map(series, (seri) => {
            return _.defaults({}, cfg, {
              data: seri
            });
          })
        };
      }

      return config;
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
