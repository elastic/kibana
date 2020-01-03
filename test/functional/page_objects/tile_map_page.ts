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

import { FtrProviderContext } from '../ftr_provider_context';

export function TileMapPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const inspector = getService('inspector');
  const { header } = getPageObjects(['common', 'header']);

  class TileMapPage {
    public async getZoomSelectors(zoomSelector: string) {
      return await find.allByCssSelector(zoomSelector);
    }

    public async clickMapButton(zoomSelector: string, waitForLoading?: boolean) {
      await retry.try(async () => {
        const zooms = await this.getZoomSelectors(zoomSelector);
        await Promise.all(zooms.map(async zoom => await zoom.click()));
        if (waitForLoading) {
          await header.waitUntilLoadingHasFinished();
        }
      });
    }

    public async getVisualizationRequest() {
      log.debug('getVisualizationRequest');
      await inspector.open();
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click('inspectorViewChooserRequests');
      await testSubjects.click('inspectorRequestDetailRequest');
      return await testSubjects.getVisibleText('inspectorRequestBody');
    }

    public async getMapBounds(): Promise<object> {
      const request = await this.getVisualizationRequest();
      const requestObject = JSON.parse(request);
      return requestObject.aggs.filter_agg.filter.geo_bounding_box['geo.coordinates'];
    }

    public async clickMapZoomIn(waitForLoading = true) {
      await this.clickMapButton('a.leaflet-control-zoom-in', waitForLoading);
    }

    public async clickMapZoomOut(waitForLoading = true) {
      await this.clickMapButton('a.leaflet-control-zoom-out', waitForLoading);
    }

    public async getMapZoomEnabled(zoomSelector: string): Promise<boolean> {
      const zooms = await this.getZoomSelectors(zoomSelector);
      const classAttributes = await Promise.all(
        zooms.map(async zoom => await zoom.getAttribute('class'))
      );
      return !classAttributes.join('').includes('leaflet-disabled');
    }

    public async zoomAllTheWayOut(): Promise<void> {
      // we can tell we're at level 1 because zoom out is disabled
      return await retry.try(async () => {
        await this.clickMapZoomOut();
        const enabled = await this.getMapZoomOutEnabled();
        // should be able to zoom more as current config has 0 as min level.
        if (enabled) {
          throw new Error('Not fully zoomed out yet');
        }
      });
    }

    public async getMapZoomInEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-in');
    }

    public async getMapZoomOutEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-out');
    }

    public async clickMapFitDataBounds() {
      return await this.clickMapButton('a.fa-crop');
    }
  }

  return new TileMapPage();
}
