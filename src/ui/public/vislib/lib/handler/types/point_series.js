import _ from 'lodash';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';

export default function ColumnHandler(Private) {
  const Handler = Private(VislibLibHandlerHandlerProvider);
  const Data = Private(VislibLibDataProvider);
  /*
   * Create handlers for Area, Column, and Line charts which
   * are all nearly the same minus a few details
   */
  function create(opts) {
    opts = opts || {};

    return function (vis) {
      const isUserDefinedYAxis = vis._attr.setYExtents;
      const config = _.defaults({}, vis._attr, {
        chartTitle: {}
      }, opts);
      const data = new Data(vis.data, vis._attr, vis.uiState);

      // todo: make sure all old params map correctly to new values

      config.type = 'point_series';

      if (!config.valueAxes) {
        config.valueAxes = [
          {
            id: 'ValueAxis-1',
            type: 'value',
            scale: {
              type: vis._attr.scale,
              setYExtents: vis._attr.setYExtents,
              defaultYExtents: vis._attr.defaultYExtents,
              min : isUserDefinedYAxis ? vis._attr.yAxis.min : undefined,
              max : isUserDefinedYAxis ? vis._attr.yAxis.max : undefined,
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
            ordered: vis.data.ordered,
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
        const series = (vis.data.rows || vis.data.columns || [vis.data])[0].series;
        config.chart = {
          type: 'point_series',
          series: _.map(series, (seri) => {
            return _.defaults({}, vis._attr, {
              data: seri
            });
          })
        };
      }

      return new Handler(vis, config);

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
