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
import { unzip } from 'lodash';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'timePicker',
    'visualize',
    'visChart',
    'visEditor',
    'vegaChart',
  ]);
  const filterBar = getService('filterBar');
  const inspector = getService('inspector');
  const vegaDebugInspectorView = getService('vegaDebugInspector');
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('vega chart in visualize app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVega');
      await PageObjects.visualize.clickVega();
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
    });

    describe('vega chart', () => {
      describe('initial render', () => {
        it('should have some initial vega spec text', async function () {
          const vegaSpec = await PageObjects.vegaChart.getSpec();
          expect(vegaSpec).to.contain('{');
          expect(vegaSpec).to.contain('data');
          expect(vegaSpec.length).to.be.above(500);
        });

        it('should have view and control containers', async function () {
          const view = await PageObjects.vegaChart.getViewContainer();
          expect(view).to.be.ok();
          const size = await view.getSize();
          expect(size).to.have.property('width');
          expect(size).to.have.property('height');
          expect(size.width).to.be.above(0);
          expect(size.height).to.be.above(0);

          const controls = await PageObjects.vegaChart.getControlContainer();
          expect(controls).to.be.ok();
        });
      });

      describe('with filters', () => {
        before(async () => {
          log.debug('setAbsoluteRange');
          await PageObjects.timePicker.setDefaultAbsoluteRange();
        });

        afterEach(async () => {
          await filterBar.removeAllFilters();
        });

        it('should render different data in response to filter change', async function () {
          await PageObjects.vegaChart.typeInSpec('"config": { "kibana": {"renderer": "svg"} },');
          await PageObjects.visEditor.clickGo();
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
          const fullDataLabels = await PageObjects.vegaChart.getYAxisLabels();
          expect(fullDataLabels[0]).to.eql('0');
          expect(fullDataLabels[fullDataLabels.length - 1]).to.eql('1,600');
          await filterBar.addFilter('@tags.raw', 'is', 'error');
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
          const filteredDataLabels = await PageObjects.vegaChart.getYAxisLabels();
          expect(filteredDataLabels[0]).to.eql('0');
          expect(filteredDataLabels[filteredDataLabels.length - 1]).to.eql('90');
        });
      });
    });

    describe('Inspector Panel', () => {
      it('should have inspector enabled', async () => {
        await inspector.expectIsEnabled();
      });

      describe('Request Tab', () => {
        beforeEach(async () => {
          await inspector.open();
        });

        afterEach(async () => {
          await inspector.close();
        });

        it('should contain "Statistics", "Request", "Response" tabs', async () => {
          await inspector.openInspectorRequestsView();

          for (const getFn of [
            inspector.getOpenRequestDetailRequestButton,
            inspector.getOpenRequestDetailResponseButton,
            inspector.getOpenRequestStatisticButton,
          ]) {
            await retry.try(async () => {
              const requestStatisticTab = await getFn();

              expect(await requestStatisticTab.isEnabled()).to.be(true);
            });
          }
        });

        it('should set the default query name if not given in the schema', async () => {
          const requests = await inspector.getRequestNames();

          expect(requests).to.be('Unnamed request #0');
        });

        it('should log the request statistic', async () => {
          await inspector.openInspectorRequestsView();
          const rawTableData = await inspector.getTableData();

          expect(unzip(rawTableData)[0].join(', ')).to.be(
            'Hits, Hits (total), Query time, Request timestamp'
          );
        });
      });

      describe('Debug Tab', () => {
        beforeEach(async () => {
          await inspector.open();
        });

        afterEach(async () => {
          await inspector.close();
        });

        it('should contain "Data Sets", "Signal Values", "Spec" tabs', async () => {
          await vegaDebugInspectorView.openVegaDebugInspectorView();

          for (const getFn of [
            vegaDebugInspectorView.getOpenDataViewerButton,
            vegaDebugInspectorView.getOpenSignalViewerButton,
            vegaDebugInspectorView.getOpenSpecViewerButton,
          ]) {
            await retry.try(async () => {
              const requestStatisticTab = await getFn();

              expect(await requestStatisticTab.isEnabled()).to.be(true);
            });
          }
        });

        it('should contain  data on "Signal Values" tab', async () => {
          await vegaDebugInspectorView.openVegaDebugInspectorView();
          await vegaDebugInspectorView.navigateToSignalViewerTab();

          const { rows, columns } = await vegaDebugInspectorView.getGridTableData();

          expect(columns.join(', ')).to.be('Signal, Value');
          expect(rows.length).to.be.greaterThan(0);
          expect(rows[0].length).to.be(2);
        });

        it('should contain data on "Signal Values" tab', async () => {
          await vegaDebugInspectorView.openVegaDebugInspectorView();
          await vegaDebugInspectorView.navigateToDataViewerTab();

          const { rows, columns } = await vegaDebugInspectorView.getGridTableData();

          expect(columns.length).to.be.greaterThan(0);
          expect(rows.length).to.be.greaterThan(0);
        });

        it('should be able to copy vega spec to clipboard', async () => {
          // The "clipboard-read" permission of the Permissions API must be granted before you can execute that test
          if (!(await browser.checkBrowserPermission('clipboard-read'))) {
            return;
          }

          await vegaDebugInspectorView.openVegaDebugInspectorView();
          await vegaDebugInspectorView.navigateToSpecViewerTab();

          const copyCopyToClipboardButton = await vegaDebugInspectorView.getCopyClipboardButton();

          await copyCopyToClipboardButton.click();

          expect(
            (await browser.getClipboardValue()).includes(
              '"$schema": "https://vega.github.io/schema/vega-lite/'
            )
          ).to.be(true);
        });
      });
    });
  });
}
