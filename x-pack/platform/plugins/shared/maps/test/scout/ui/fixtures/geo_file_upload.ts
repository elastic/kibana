/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class GeoFileUploadPage {
  private readonly importFileButton;
  private readonly fileUploadStatusCallout;
  private readonly fileUploadIndexNameInput;

  constructor(private readonly page: ScoutPage) {
    this.importFileButton = this.page.testSubj.locator('importFileButton');
    this.fileUploadStatusCallout = this.page.testSubj.locator('fileUploadStatusCallout');
    this.fileUploadIndexNameInput = this.page.testSubj.locator('fileUploadIndexNameInput');
  }

  async previewGeoJsonFile(filePath: string) {
    await this.page.testSubj.locator('geoFilePicker').setInputFiles(filePath);
    await expect(this.importFileButton).toBeEnabled({ timeout: 30_000 });
  }

  async previewShapefile(shpPath: string) {
    await this.page.testSubj.locator('geoFilePicker').setInputFiles(shpPath);
    await this.page.testSubj
      .locator('shapefileSideCarFilePicker_dbf')
      .setInputFiles(shpPath.replace('.shp', '.dbf'));
    await this.page.testSubj
      .locator('shapefileSideCarFilePicker_prj')
      .setInputFiles(shpPath.replace('.shp', '.prj'));
    await this.page.testSubj
      .locator('shapefileSideCarFilePicker_shx')
      .setInputFiles(shpPath.replace('.shp', '.shx'));
    await expect(this.importFileButton).toBeEnabled({ timeout: 30_000 });
  }

  async setIndexName(name: string) {
    await this.fileUploadIndexNameInput.fill(name);
    await expect.poll(() => this.fileUploadIndexNameInput.inputValue()).toBe(name);
  }

  async uploadFile() {
    await expect(this.importFileButton).toBeEnabled({ timeout: 30_000 });
    await this.importFileButton.click();
    await this.fileUploadStatusCallout.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async addFileAsDocumentLayer() {
    await this.importFileButton.click();
  }

  async getFileUploadStatusCalloutMsg() {
    return (await this.fileUploadStatusCallout.innerText())
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }
}
