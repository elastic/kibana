/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class TileMapPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');
  private readonly header = this.ctx.getPageObject('header');

  public async getZoomSelectors(zoomSelector: string) {
    return await this.find.allByCssSelector(zoomSelector);
  }

  public async clickMapButton(zoomSelector: string, waitForLoading?: boolean) {
    await this.retry.try(async () => {
      const zooms = await this.getZoomSelectors(zoomSelector);
      for (let i = 0; i < zooms.length; i++) {
        await zooms[i].click();
      }
      if (waitForLoading) {
        await this.header.waitUntilLoadingHasFinished();
      }
    });
  }

  public async getVisualizationRequest() {
    this.log.debug('getVisualizationRequest');
    await this.inspector.open();
    await this.testSubjects.click('inspectorViewChooser');
    await this.testSubjects.click('inspectorViewChooserRequests');
    await this.testSubjects.click('inspectorRequestDetailRequest');
    await this.find.byCssSelector('.react-monaco-editor-container');

    return await this.monacoEditor.getCodeEditorValue(1);
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
      zooms.map(async (zoom) => await zoom.getAttribute('class'))
    );
    return !classAttributes.join('').includes('leaflet-disabled');
  }

  public async zoomAllTheWayOut(): Promise<void> {
    // we can tell we're at level 1 because zoom out is disabled
    return await this.retry.try(async () => {
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
