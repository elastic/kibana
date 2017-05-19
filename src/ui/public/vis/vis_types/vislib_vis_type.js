import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import { VisTypeProvider } from './base_vis_type';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import VislibProvider from 'ui/vislib';

export function VislibVisTypeProvider(Private) {
  const VisType = Private(VisTypeProvider);
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const vislib = Private(VislibProvider);

  class VislibVisController {
    constructor(el) {
      this.el = el;
    }

    render(vis, esResponse) {
      if (this.vislibVis) {
        this.destroy();
      }

      return new Promise(resolve => {
        this.vis = vis;
        vis.vislibVis = new vislib.Vis(this.el, vis.params);
        vis.vislibVis.on('brush', vis.API.events.brush);
        vis.vislibVis.on('click', vis.API.events.filter);
        vis.vislibVis.on('renderComplete', resolve);
        vis.vislibVis.render(esResponse, vis.getUiState());
        vis.refreshLegend++;
      });
    }

    destroy() {
      if (this.vislibVis) {
        this.vis.vislibVis.off('brush', this.vis.API.events.brush);
        this.vis.vislibVis.off('click', this.vis.API.events.filter);
        this.vis.vislibVis.destroy();
      }
    }
  }

  class VislibVisType extends VisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'basic';
      }
      if (!opts.responseConverter) {
        opts.responseConverter = pointSeries;
      }
      opts.visualization = VislibVisController;
      super(opts);
      this.refreshLegend = 0;
    }
  }

  return VislibVisType;
}
