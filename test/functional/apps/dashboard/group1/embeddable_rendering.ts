/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * This tests both that one of each visualization can be added to a dashboard (as opposed to opening an existing
 * dashboard with the visualizations already on it), as well as conducts a rough type of snapshot testing by checking
 * for various ui components. The downside is these tests are a bit fragile to css changes (though not as fragile as
 * actual screenshot snapshot regression testing), and can be difficult to diagnose failures (which visualization
 * broke?).  The upside is that this offers very good coverage with a minimal time investment.
 */

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const pieChart = getService('pieChart');
  const elasticChart = getService('elasticChart');
  const security = getService('security');
  const dashboardExpect = getService('dashboardExpect');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'visualize',
    'visChart',
    'discover',
    'timePicker',
  ]);
  let visNames: string[] = [];

  const expectAllDataRenders = async () => {
    await pieChart.expectSliceCountForAllPies(16);
    await dashboardExpect.metricValuesExist(['7,544']);
    await dashboardExpect.seriesElementCount(14);
    const tsvbGuageExists = await find.existsByCssSelector('.tvbVisHalfGauge');
    expect(tsvbGuageExists).to.be(true);
    await dashboardExpect.timelionLegendCount(0);
    await dashboardExpect.markdownWithValuesExists(["I'm a markdown!"]);
    await dashboardExpect.vegaTextsExist(['5,000']);
    await dashboardExpect.goalAndGuageLabelsExist(['62.925%', '55.625%', '11.915 GB']);
    await dashboardExpect.dataTableRowCount(5);
    await dashboardExpect.tagCloudWithValuesFound(['CN', 'IN', 'US', 'BR', 'ID']);
    // TODO add test for 'tsvb gauge' viz
    // This tests the presence of the two input control embeddables
    await dashboardExpect.inputControlItemCount(5);
    await dashboardExpect.tsvbTableCellCount(20);
    await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes: 6286.674715909091']);
    await dashboardExpect.tsvbTopNValuesExist(['5,734.79', '6,286.675']);
    await dashboardExpect.tsvbMetricValuesExist(['210,007,889,606']);
    // TODO add test for 'animal sound pie' viz

    // This tests line charts that do not use timeseries data
    const dogData = await elasticChart.getChartDebugData('xyVisChart', 2);
    const pointCount = dogData?.lines?.reduce((acc, a) => {
      return acc + a.points.length;
    }, 0);
    expect(pointCount).to.equal(6);

    // TODO add test for 'scripted filter and query' viz
    // TODO add test for 'animal weight linked to search' viz
    // TODO add test for the last vega viz
    await dashboardExpect.savedSearchRowCount(11);
  };

  const expectNoDataRenders = async () => {
    await pieChart.expectEmptyPieChart();
    await dashboardExpect.seriesElementCount(0);
    await dashboardExpect.dataTableNoResult();
    await dashboardExpect.savedSearchNoResult();
    await dashboardExpect.inputControlItemCount(5);
    await dashboardExpect.metricValuesExist(['0']);
    await dashboardExpect.markdownWithValuesExists(["I'm a markdown!"]);

    // Three instead of 0 because there is a visualization based off a non time based index that
    // should still show data.
    const dogData = await elasticChart.getChartDebugData('xyVisChart', 2);
    const pointCount = dogData?.lines?.reduce((acc, a) => {
      return acc + a.points.length;
    }, 0);
    expect(pointCount).to.equal(6);

    await dashboardExpect.timelionLegendCount(0);
    const tsvbGuageExists = await find.existsByCssSelector('.tvbVisHalfGauge');
    expect(tsvbGuageExists).to.be(true);
    await dashboardExpect.tsvbMetricValuesExist(['-']);
    await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes:']);
    await dashboardExpect.tsvbTableCellCount(0);
    await dashboardExpect.tsvbTopNValuesExist(['-']);
    await dashboardExpect.vegaTextsDoNotExist(['5,000']);
  };

  describe('dashboard embeddable rendering', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'animals', 'test_logstash_reader']);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await elasticChart.setNewChartUiDebugFlag(true);

      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'Apr 13, 2018 @ 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async () => {
      // Get rid of the timestamp added in this test, as well any global or app state.
      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl.replace(/\?.*$/, '');
      await browser.get(newUrl, false);
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('adding visualizations', async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      visNames = await dashboardAddPanel.addEveryVisualization('"Rendering Test"');
      expect(visNames.length).to.be.equal(24);
      await dashboardExpect.visualizationsArePresent(visNames);

      // This one is rendered via svg which lets us do better testing of what is being rendered.
      visNames.push(await dashboardAddPanel.addVisualization('Filter Bytes Test: vega'));
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardExpect.visualizationsArePresent(visNames);
      expect(visNames.length).to.be.equal(25);
      await PageObjects.dashboard.waitForRenderComplete();
    });

    it('adding saved searches', async () => {
      const visAndSearchNames = visNames.concat(
        await dashboardAddPanel.addEverySavedSearch('"Rendering Test"')
      );
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardExpect.visualizationsArePresent(visAndSearchNames);
      expect(visAndSearchNames.length).to.be.equal(26);
      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.dashboard.saveDashboard('embeddable rendering test', {
        storeTimeWithDashboard: true,
      });
    });

    it('initial render test', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag();
      await expectAllDataRenders();
    });

    it('data rendered correctly when dashboard is opened from listing page', async () => {
      // Change the time to make sure that it's updated when re-opened from the listing page.
      const fromTime = 'May 10, 2018 @ 00:00:00.000';
      const toTime = 'May 11, 2018 @ 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.loadSavedDashboard('embeddable rendering test');
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });

    it('data rendered correctly when dashboard is hard refreshed', async () => {
      await browser.refresh();
      const alert = await browser.getAlert();
      await alert?.accept();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await elasticChart.setNewChartUiDebugFlag();
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });

    it('panels are updated when time changes outside of data', async () => {
      const fromTime = 'May 11, 2018 @ 00:00:00.000';
      const toTime = 'May 12, 2018 @ 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.waitForRenderComplete();
      await expectNoDataRenders();
    });

    it('panels are updated when time changes inside of data', async () => {
      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'Apr 13, 2018 @ 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });
  });
}
