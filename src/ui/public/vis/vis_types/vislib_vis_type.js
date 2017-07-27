import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/gauge_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import AggConfigResult from 'ui/vis/agg_config_result';
import { VisTypeProvider } from './base_vis_type';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import VislibProvider from 'ui/vislib';

const buildAggConfigResult = (aggs, e, vis) => {
  const getValue = (agg) => {
    if (agg.value === 'y') {
      return e.point.y;
    } else if (agg.value === 'x') {
      return e.point.x;
    } else if (agg.value === 'x_as_string') {
      return e.point.x;
    } else {
      return agg.rawValue || agg.value;
    }
  };
  let aggConfigResult;
  aggs.reverse().forEach(agg => {
    let value = getValue(agg);
    const aggConfig = vis.aggs.find(aggCfg => aggCfg.id === agg.id);
    if (aggConfig.type.name === 'range' && aggConfig.schema.name === 'segment') value = e.point.x_raw;
    aggConfigResult = new AggConfigResult(aggConfig, aggConfigResult, value, value);
  });

  return aggConfigResult;
};

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
        this.vis.vislibVis.on('brush', e => {
          e.data.xAxisField = this.vis.aggs.find(agg => agg.schema.name === 'segment').params.field;
          e.data.indexPattern = this.vis.indexPattern;
          this.vis.API.events.brush(e);
        });
        this.vis.vislibVis.on('click', e => {
          e.point.aggConfigResult = buildAggConfigResult(e.aggs.slice(), e, this.vis);
          this.vis.API.events.filter(e);
        });
        this.vis.vislibVis.on('renderComplete', resolve);
        this.vis.vislibVis.render(esResponse, this.vis.getUiState());
        this.vis.refreshLegend++;
      });
    }

    destroy() {
      if (this.vis.vislibVis) {
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
