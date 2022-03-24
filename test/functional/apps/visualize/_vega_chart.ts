/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unzip } from 'lodash';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const getTestSpec = (expression: string) => `
{
config: { "kibana": {"renderer": "svg"} }
$schema: https://vega.github.io/schema/vega/v5.json
marks: [{
  type: text
  encode: { update: { text: { value: "Test" } } }
}]
signals: [ {
  on: [{
  events: click
  update: ${expression}
  }]
}]}`;

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
      await PageObjects.visualize.initTests();
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
            'getOpenRequestDetailRequestButton',
            'getOpenRequestDetailResponseButton',
            'getOpenRequestStatisticButton',
          ] as const) {
            await retry.try(async () => {
              const requestStatisticTab = await inspector[getFn]();

              expect(await requestStatisticTab.isEnabled()).to.be(true);
            });
          }
        });

        it('should set the default query name if not given in the schema', async () => {
          const singleExampleRequest = await inspector.hasSingleRequest();
          const selectedExampleRequest = await inspector.getSelectedOption();

          expect(singleExampleRequest).to.be(true);
          expect(selectedExampleRequest).to.equal('Unnamed request #0');
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
            'getOpenDataViewerButton',
            'getOpenSignalViewerButton',
            'getOpenSpecViewerButton',
          ] as const) {
            await retry.try(async () => {
              const requestStatisticTab = await vegaDebugInspectorView[getFn]();

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
          await vegaDebugInspectorView.openVegaDebugInspectorView();
          await vegaDebugInspectorView.navigateToSpecViewerTab();

          const copyCopyToClipboardButton = await vegaDebugInspectorView.getCopyClipboardButton();

          expect(await copyCopyToClipboardButton.isEnabled()).to.be(true);

          // The "clipboard-read" permission of the Permissions API must be granted
          if (!(await browser.checkBrowserPermission('clipboard-read'))) {
            return;
          }

          await copyCopyToClipboardButton.click();

          expect(
            (await browser.getClipboardValue()).includes(
              '"$schema": "https://vega.github.io/schema/vega-lite/'
            )
          ).to.be(true);
        });
      });
    });

    describe('Vega extension functions', () => {
      beforeEach(async () => {
        const filtersCount = await filterBar.getFilterCount();
        if (filtersCount > 0) {
          await filterBar.removeAllFilters();
        }
      });

      const fillSpecAndGo = async (newSpec: string) => {
        await PageObjects.vegaChart.fillSpec(newSpec);
        await PageObjects.visEditor.clickGo();

        const viewContainer = await PageObjects.vegaChart.getViewContainer();
        const textElement = await viewContainer.findByTagName('text');

        await textElement.click();
      };

      it('should update global time range by calling "kibanaSetTimeFilter" expression', async () => {
        await fillSpecAndGo(getTestSpec('kibanaSetTimeFilter("2019", "2020")'));

        const currentTimeRange = await PageObjects.timePicker.getTimeConfig();

        expect(currentTimeRange.start).to.be('Jan 1, 2019 @ 00:00:00.000');
        expect(currentTimeRange.end).to.be('Jan 1, 2020 @ 00:00:00.000');
      });

      it('should set filter by calling "kibanaAddFilter" expression', async () => {
        await fillSpecAndGo(
          getTestSpec('kibanaAddFilter({ query_string: { query: "response:200" }})')
        );

        expect(await filterBar.getFilterCount()).to.be(1);
      });

      it('should remove filter by calling "kibanaRemoveFilter" expression', async () => {
        await filterBar.addFilter('response', 'is', '200');

        expect(await filterBar.getFilterCount()).to.be(1);

        await fillSpecAndGo(
          getTestSpec('kibanaRemoveFilter({ match_phrase: { response: "200" }})')
        );

        expect(await filterBar.getFilterCount()).to.be(0);
      });

      it('should remove all filters by calling "kibanaRemoveAllFilters" expression', async () => {
        await filterBar.addFilter('response', 'is', '200');
        await filterBar.addFilter('response', 'is', '500');

        expect(await filterBar.getFilterCount()).to.be(2);

        await fillSpecAndGo(getTestSpec('kibanaRemoveAllFilters()'));

        expect(await filterBar.getFilterCount()).to.be(0);
      });
    });
  });
}
