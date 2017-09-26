import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/gauge_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import { VisTypeProvider } from './base_vis_type';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import VislibProvider from 'ui/vislib';

export function VislibVisTypeProvider(Private) {
  const VisType = Private(VisTypeProvider);
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const vislib = Private(VislibProvider);

  class VislibVisController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
    }

    render(esResponse) {
      this._response = esResponse;
      if (this.vis.vislibVis) {
        this.destroy();
      } else {
        this.vis.refreshLegend = 0;
      }

      return new Promise((resolve, reject) => {
        if (!this._response) return reject();
        this.vis.vislibVis = new vislib.Vis(this.el, this.vis.params);
        this.vis.vislibVis.on('brush', this.vis.API.events.brush);
        this.vis.vislibVis.on('click', this.vis.API.events.filter);
        this.vis.vislibVis.on('renderComplete', resolve);
        this.vis.vislibVis.render(esResponse, this.vis.getUiState());
      });
    }

    destroy() {
      if (this.vis.vislibVis) {
        this.vis.vislibVis.off('brush', this.vis.API.events.brush);
        this.vis.vislibVis.off('click', this.vis.API.events.filter);
        this.vis.vislibVis.destroy();
        delete this.vis.vislibVis;
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
