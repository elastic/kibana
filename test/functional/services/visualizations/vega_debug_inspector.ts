/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function VegaDebugInspectorViewProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const inspector = getService('inspector');
  const dataGrid = getService('dataGrid');

  class VegaDebugInspectorView {
    async openVegaDebugInspectorView() {
      await inspector.openInspectorView('inspectorViewChooserVega debug');
    }

    public getOpenDataViewerButton() {
      return testSubjects.find('vegaDataInspectorDataViewerButton');
    }

    public getOpenSignalViewerButton() {
      return testSubjects.find('vegaDataInspectorSignalViewerButton');
    }

    public getOpenSpecViewerButton() {
      return testSubjects.find('vegaDataInspectorSpecViewerButton');
    }

    public getCopyClipboardButton() {
      return testSubjects.find('vegaDataInspectorCopyClipboardButton');
    }

    public getGridTableData() {
      return dataGrid.getDataGridTableData();
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

  return new VegaDebugInspectorView();
}
