import _ from 'lodash';
import errors from 'ui/errors';

export default function ColumnHandler(Private) {

  const createSeries = (cfg, series) => {
    const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(cfg.mode);
    let interpolate = cfg.interpolate;
    // for backward compatibility when loading URLs or configs we need to check smoothLines
    if (cfg.smoothLines) interpolate = 'cardinal';

    return {
      type: 'point_series',
      series: _.map(series, (seri) => {
        return {
          show: true,
          type: cfg.type || 'line',
          mode: stacked ? 'stacked' : 'normal',
          interpolate: interpolate,
          drawLinesBetweenPoints: cfg.drawLinesBetweenPoints,
          showCircles: cfg.showCircles,
          radiusRatio: cfg.radiusRatio,
          data: seri
        };
      })
    };
  };

  const createCharts = (cfg, data) => {
    if (data.rows || data.columns) {
      const charts = data.rows ? data.rows : data.columns;
      return charts.map(chart => {
        return createSeries(cfg, chart.series);
      });
    }

    return [createSeries(cfg, data.series)];
  };
  /*
   * Create handlers for Area, Column, and Line charts which
   * are all nearly the same minus a few details
   */
  function create(opts) {
    opts = opts || {};

    return function (cfg, data) {
      const isUserDefinedYAxis = cfg.setYExtents;
      const config = _.cloneDeep(cfg);
      _.defaultsDeep(config, {
        chartTitle: {},
        mode: 'normal'
      }, opts);

      config.type = 'point_series';

      if (!config.tooltip) {
        config.tooltip = {
          show: cfg.addTooltip
        };
      }

      if (!config.valueAxes) {
        let mode = config.mode;
        if (['stacked', 'overlap'].includes(mode)) mode = 'normal';
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
              mode : mode
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

      if (!config.charts) {
        config.charts = createCharts(cfg, data.data);
      }

      if (typeof config.enableHover === 'undefined') config.enableHover = true;

      return config;
    };
  }

  return {
    line: create(),

    column: create({
      expandLastBucket: true
    }),

    area: create({
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
    }),

    heatmap: (cfg, data) => {
      const defaults = create()(cfg, data);
      defaults.valueAxes[0].show = false;
      defaults.categoryAxes[0].style = {
        rangePadding: 0,
        rangeOuterPadding: 0
      };
      defaults.valueAxes.push({
        id: 'CategoryAxis-2',
        type: 'category',
        position: 'left',
        values: data.getLabels(),
        scale: {
          inverted: true
        },
        labels: {
          axisFormatter: val => val
        },
        style: {
          rangePadding: 0,
          rangeOuterPadding: 0
        }
      });
      return defaults;
    }
  };
};
