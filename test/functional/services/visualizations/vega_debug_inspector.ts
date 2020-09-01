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
