import _ from 'lodash';
import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import 'plugins/kbn_vislib_vis_types/controls/gauge_options';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import VislibVisTypeVislibRenderbotProvider from 'ui/vislib_vis_type/vislib_renderbot';

export function VislibVisTypeVislibVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const VislibRenderbot = Private(VislibVisTypeVislibRenderbotProvider);

  // converts old config format (pre 5.2) to the new one
  const updateParams = function (params) {

    const updateIfSet = (from, to, prop, func) => {
      if (from[prop]) {
        to[prop] = func ? func(from[prop]) : from[prop];
        delete from[prop];
      }
    };

    if (params.gauge) {
      updateIfSet(params, params.gauge.style, 'fontSize');
    }

    if (params.seriesParams) {
      updateIfSet(params, params.seriesParams[0], 'drawLinesBetweenPoints');
      updateIfSet(params, params.seriesParams[0], 'showCircles');
      updateIfSet(params, params.seriesParams[0], 'radiusRatio');
      updateIfSet(params, params.seriesParams[0], 'interpolate');
      updateIfSet(params, params.seriesParams[0], 'type');

      if (params.mode) {
        const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(params.mode);
        params.seriesParams[0].mode = stacked ? 'stacked' : 'normal';
        const axisMode = ['stacked', 'overlap'].includes(params.mode) ? 'normal' : params.mode;
        params.valueAxes[0].scale.mode = axisMode;
        delete params.mode;
      }

      if (params.smoothLines) {
        params.seriesParams[0].interpolate = 'cardinal';
        delete params.smoothLines;
      }
    }

    if (params.valueAxes) {
      updateIfSet(params, params.valueAxes[0].scale, 'setYExtents');
      updateIfSet(params, params.valueAxes[0].scale, 'defaultYExtents');

      if (params.scale) {
        params.valueAxes[0].scale.type = params.scale;
        delete params.scale;
      }
    }

    if (params.categoryAxes && params.categoryAxes.length) {
      updateIfSet(params, params.categoryAxes[0], 'expandLastBucket');
    }
  };

  _.class(VislibVisType).inherits(VisType);
  function VislibVisType(opts = {}) {
    VislibVisType.Super.call(this, opts);

    if (this.responseConverter == null) {
      this.responseConverter = pointSeries;
    }

    this.listeners = opts.listeners || {};
  }

  VislibVisType.prototype.createRenderbot = function (vis, $el, uiState) {
    if (vis.type.name !== 'pie') updateParams(vis.params);
    return new VislibRenderbot(vis, $el, uiState);
  };

  return VislibVisType;
}
