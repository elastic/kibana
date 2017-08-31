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

  _.class(VislibVisType).inherits(VisType);
  function VislibVisType(opts = {}) {
    VislibVisType.Super.call(this, opts);

    if (this.responseConverter == null) {
      this.responseConverter = pointSeries;
    }

    this.listeners = opts.listeners || {};
  }

  VislibVisType.prototype.createRenderbot = function (vis, $el, uiState) {
    return new VislibRenderbot(vis, $el, uiState);
  };

  return VislibVisType;
}
