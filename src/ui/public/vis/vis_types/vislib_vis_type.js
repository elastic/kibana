import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import VislibProvider from 'ui/vislib';

export function VislibVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const vislib = Private(VislibProvider);

  class VislibVisType extends VisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'basic';
      }
      if (!opts.responseConverter) {
        opts.responseConverter = pointSeries;
      }
      super(opts);
      this.refreshLegend = 0;
    }

    render(vis, $el, uiState, esResponse) {
      if (this.vislibVis) {
        this.destroy(vis);
      }

      this.vislibVis = new vislib.Vis($el[0], vis.params);
      this.vislibVis.on('brush', vis.API.events.brush);
      this.vislibVis.on('click', vis.API.events.click);
      this.vislibVis.render(esResponse, uiState);
      this.refreshLegend++;
    }

    destroy(vis) {
      this.vislibVis.off('brush', vis.API.events.brush);
      this.vislibVis.off('click', vis.API.events.click);
      this.vislibVis.destroy();
    }
  }



  return VislibVisType;
}
