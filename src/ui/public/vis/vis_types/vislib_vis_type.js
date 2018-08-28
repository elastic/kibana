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
import { BaseVisType } from './base_vis_type';
import { AggResponsePointSeriesProvider } from '../../agg_response/point_series/point_series';
import VislibProvider from '../../vislib';
import $ from 'jquery';

export function VislibVisTypeProvider(Private, $rootScope, $timeout, $compile) {
  const pointSeries = Private(AggResponsePointSeriesProvider);
  const vislib = Private(VislibProvider);

  const legendClassName = {
    top: 'vislib-container--legend-top',
    bottom: 'vislib-container--legend-bottom',
    left: 'vislib-container--legend-left',
    right: 'vislib-container--legend-right',
  };

  class VislibVisController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;

      this.container = document.createElement('div');
      this.container.className = 'vislib-container';
      this.el.appendChild(this.container);

      this.chartEl = document.createElement('div');
      this.chartEl.className = 'vislib-chart';
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

        let $scope;
        if (this.vis.params.addLegend) {
          $(this.container).attr('class', (i, cls) => {
            return cls.replace(/vislib-container--legend-\S+/g, '');
          }).addClass(legendClassName[this.vis.params.legendPosition]);

          $scope = $rootScope.$new();
          $scope.refreshLegend = 0;
          $scope.vis = this.vis;
          $scope.visData = esResponse;
          $scope.uiState = $scope.vis.getUiState();
          const legendHtml = $compile('<vislib-legend></vislib-legend>')($scope);
          this.container.appendChild(legendHtml[0]);
          $scope.$digest();
        }

        this.vis.vislibVis = new vislib.Vis(this.chartEl, this.vis.params);
        this.vis.vislibVis.on('brush', this.vis.API.events.brush);
        this.vis.vislibVis.on('click', this.vis.API.events.filter);
        this.vis.vislibVis.on('renderComplete', resolve);
        this.vis.vislibVis.render(esResponse, this.vis.getUiState());

        if (this.vis.params.addLegend) {
          $scope.refreshLegend++;
          $scope.$digest();
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
    }
  }

  class VislibVisType extends BaseVisType {
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
