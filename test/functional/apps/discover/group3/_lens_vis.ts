/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const browser = getService('browser');
  const PageObjects = getPageObjects([
    'lens',
    'settings',
    'common',
    'discover',
    'header',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
    'unifiedSearch',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  const defaultTimespan =
    'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000 (interval: Auto - 3 hours)';
  const defaultTotalCount = '14,004';

  async function checkNoVis(totalCount: string) {
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.discover.waitUntilSearchingHasFinished();

    expect(await PageObjects.discover.isChartVisible()).to.be(false);
    expect(await PageObjects.discover.getHitCount()).to.be(totalCount);
  }

  async function checkHistogramVis(timespan: string, totalCount: string) {
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.discover.waitUntilSearchingHasFinished();

    await testSubjects.existOrFail('xyVisChart');
    await testSubjects.existOrFail('unifiedHistogramEditVisualization');
    await testSubjects.existOrFail('unifiedHistogramBreakdownSelectorButton');
    await testSubjects.existOrFail('unifiedHistogramTimeIntervalSelectorButton');
    expect(await PageObjects.discover.getChartTimespan()).to.be(timespan);
    expect(await PageObjects.discover.getHitCount()).to.be(totalCount);
  }

  async function checkESQLHistogramVis(timespan: string, totalCount: string) {
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.discover.waitUntilSearchingHasFinished();

    await testSubjects.existOrFail('xyVisChart');
    await testSubjects.existOrFail('unifiedHistogramSaveVisualization');
    await testSubjects.existOrFail('unifiedHistogramEditFlyoutVisualization');
    await testSubjects.missingOrFail('unifiedHistogramEditVisualization');
    await testSubjects.missingOrFail('unifiedHistogramBreakdownSelectorButton');
    await testSubjects.missingOrFail('unifiedHistogramTimeIntervalSelectorButton');
    expect(await PageObjects.discover.getChartTimespan()).to.be(timespan);
    expect(await PageObjects.discover.getHitCount()).to.be(totalCount);
  }

  describe('discover lens vis', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should show histogram by default', async () => {
      await checkHistogramVis(defaultTimespan, defaultTotalCount);

      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 23:50:13.253'
      );

      const savedSearchTimeSpan =
        'Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 23:50:13.253 (interval: Auto - 30 minutes)';
      const savedSearchTotalCount = '4,756';
      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);

      await PageObjects.discover.saveSearch('testDefault');

      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);

      await browser.refresh();

      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);
    });

    it('should show no histogram for no results view and recover when time range expanded', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 19, 2015 @ 00:00:00.000',
        'Sep 19, 2015 @ 00:00:00.000'
      );

      expect(await PageObjects.discover.hasNoResults()).to.be(true);

      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 00:00:00.000'
      );

      await checkHistogramVis(
        'Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 00:00:00.000 (interval: Auto - millisecond)',
        '1'
      );
    });

    it('should show no histogram for non-time-based data views and recover for time-based data views', async () => {
      await PageObjects.discover.createAdHocDataView('logs*', false);

      await checkNoVis(defaultTotalCount);

      await PageObjects.discover.clickIndexPatternActions();
      await PageObjects.unifiedSearch.editDataView('logs*', '@timestamp');

      await checkHistogramVis(defaultTimespan, defaultTotalCount);
    });

    it('should show ESQL histogram for text-based query', async () => {
      await PageObjects.discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 00:00:00.000'
      );

      await checkESQLHistogramVis('Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 00:00:00.000', '1');
    });

    it('should be able to customize ESQL histogram and save it', async () => {
      await PageObjects.discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      await PageObjects.lens.switchLayerSeriesType('line');
      await testSubjects.click('applyFlyoutButton');

      await PageObjects.discover.saveSearch('testCustomESQLHistogram');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      expect(await testSubjects.getVisibleText('lns_layer_settings')).to.be('Line');
    });
  });
}
