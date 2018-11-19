/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series_options';
import 'plugins/kbn_vislib_vis_types/controls/line_interpolation_option';
import 'plugins/kbn_vislib_vis_types/controls/heatmap_options';
import 'plugins/kbn_vislib_vis_types/controls/gauge_options';
import 'plugins/kbn_vislib_vis_types/controls/point_series';
import './vislib_vis_legend';
import { BaseVisTypeProvider } from './base_vis_type';
import { AggResponsePointSeriesProvider } from '../../agg_response/point_series/point_series';
import VislibProvider from '../../vislib';
import { VisFiltersProvider } from '../vis_filters';
import $ from 'jquery';
import { defaultsDeep } from 'lodash';

export function VislibVisTypeProvider(Private, $rootScope, $timeout, $compile) {
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const vislib = Private(VislibProvider);
  const visFilters = Private(VisFiltersProvider);
  const BaseVisType = Private(BaseVisTypeProvider);

  const legendClassName = {
    top: 'visLib--legend-top',
    bottom: 'visLib--legend-bottom',
    left: 'visLib--legend-left',
    right: 'visLib--legend-right',
  };

  class VislibVisController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
      this.$scope = null;

      this.container = document.createElement('div');
      this.container.className = 'visLib';
      this.el.appendChild(this.container);

      this.chartEl = document.createElement('div');
      this.chartEl.className = 'visLib__chart';
      this.container.appendChild(this.chartEl);

    }

    render(esResponse) {
      if (this.vis.vislibVis) {
        this.destroy();
      }

      return new Promise(async (resolve) => {
        if (this.el.clientWidth === 0 || this.el.clientHeight === 0) {
          return resolve();
        }

        if (this.vis.params.addLegend) {
          $(this.container).attr('class', (i, cls) => {
            return cls.replace(/visLib--legend-\S+/g, '');
          }).addClass(legendClassName[this.vis.params.legendPosition]);

          this.$scope = $rootScope.$new();
          this.$scope.refreshLegend = 0;
          this.$scope.vis = this.vis;
          this.$scope.visData = esResponse;
          this.$scope.uiState = this.$scope.vis.getUiState();
          const legendHtml = $compile('<vislib-legend></vislib-legend>')(this.$scope);
          this.container.appendChild(legendHtml[0]);
          this.$scope.$digest();
        }

        this.vis.vislibVis = new vislib.Vis(this.chartEl, this.vis.params);
        this.vis.vislibVis.on('brush', this.vis.API.events.brush);
        this.vis.vislibVis.on('click', this.vis.API.events.filter);
        this.vis.vislibVis.on('renderComplete', resolve);
        this.vis.vislibVis.render(esResponse, this.vis.getUiState());

        if (this.vis.params.addLegend) {
          this.$scope.refreshLegend++;
          this.$scope.$digest();
        }
      });
    }

    destroy() {
      if (this.vis.vislibVis) {
        this.vis.vislibVis.off('brush', this.vis.API.events.brush);
        this.vis.vislibVis.off('click', this.vis.API.events.filter);
        this.vis.vislibVis.destroy();
        delete this.vis.vislibVis;
      }
      $(this.container).find('vislib-legend').remove();
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    }
  }

  class VislibVisType extends BaseVisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'vislib_series';
        opts.responseHandlerConfig = { asAggConfigResults: true };
      }
      if (!opts.responseConverter) {
        opts.responseConverter = pointSeries;
      }
      opts.events = defaultsDeep({}, opts.events, {
        filterBucket: {
          defaultAction: visFilters.filter,
        },
        brush: {
          defaultAction: visFilters.brush,
        }
      });
      opts.visualization = VislibVisController;
      super(opts);
      this.refreshLegend = 0;
    }
  }

  return VislibVisType;
}
