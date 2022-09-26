/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../../ftr_provider_context';

export class VegaDebugInspectorViewService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly dataGrid = this.ctx.getService('dataGrid');

  async openVegaDebugInspectorView() {
    await this.inspector.openInspectorView('Vega debug');
  }

  public getOpenDataViewerButton() {
    return this.testSubjects.find('vegaDataInspectorDataViewerButton');
  }

  public getOpenSignalViewerButton() {
    return this.testSubjects.find('vegaDataInspectorSignalViewerButton');
  }

  public getOpenSpecViewerButton() {
    return this.testSubjects.find('vegaDataInspectorSpecViewerButton');
  }

  public getCopyClipboardButton() {
    return this.testSubjects.find('vegaDataInspectorCopyClipboardButton');
  }

  public getGridTableData() {
    return this.dataGrid.getDataGridTableData();
  }

  public async navigateToDataViewerTab() {
    const dataViewerButton = await this.getOpenDataViewerButton();
    await dataViewerButton.click();
  }

  public async navigateToSignalViewerTab() {
    const signalViewerButton = await this.getOpenSignalViewerButton();
    await signalViewerButton.click();
  }

  public async navigateToSpecViewerTab() {
    const specViewerButton = await this.getOpenSpecViewerButton();
    await specViewerButton.click();
  }
}
