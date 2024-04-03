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
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects([
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
  const defaultTimespanESQL = 'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000';
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

  async function changeVisSeriesType(seriesType: string) {
    await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
    await retry.waitFor('flyout', async () => {
      return await testSubjects.exists('lnsChartSwitchPopover');
    });
    await testSubjects.click('lnsChartSwitchPopover');
    await testSubjects.setValue('lnsChartSwitchSearch', seriesType, {
      clearWithKeyboard: true,
    });
    await testSubjects.click(`lnsChartSwitchPopover_${seriesType.toLowerCase()}`);
    await retry.try(async () => {
      expect(await testSubjects.getVisibleText('lnsChartSwitchPopover')).to.be(seriesType);
    });

    await toasts.dismissAll();
    await testSubjects.scrollIntoView('applyFlyoutButton');
    await testSubjects.click('applyFlyoutButton');
  }

  async function getCurrentVisSeriesTypeLabel() {
    await toasts.dismissAll();
    await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
    const seriesType = await testSubjects.getVisibleText('lnsChartSwitchPopover');
    await testSubjects.click('cancelFlyoutButton');
    return seriesType;
  }

  async function getCurrentVisChartTitle() {
    const chartElement = await find.byCssSelector(
      '[data-test-subj="unifiedHistogramChart"] [data-render-complete="true"]'
    );
    return await chartElement.getAttribute('data-title');
  }

  describe('discover lens vis', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await browser.setWindowSize(1300, 1000);
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

      await changeVisSeriesType('Line');

      await PageObjects.discover.saveSearch('testCustomESQLHistogram');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');
    });

    it('should be able to load a saved search with custom histogram vis, edit vis and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await changeVisSeriesType('Area');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Area');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
    });

    it('should be able to load a saved search with custom histogram vis, edit query and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // by changing the query we reset the histogram customization
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Bar vertical stacked');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await checkESQLHistogramVis(defaultTimespanESQL, '10');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // now we are changing to a different query to check lens suggestion logic too
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5');
      await PageObjects.discover.chooseLensChart('Donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');
      expect(await getCurrentVisChartTitle()).to.be('Bar vertical stacked');

      await checkESQLHistogramVis(defaultTimespanESQL, '10');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
    });

    it('should be able to load a saved search with custom histogram vis and handle invalidations', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // now we are changing to a different query to check invalidation logic
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5');
      await PageObjects.discover.chooseLensChart('Donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await PageObjects.discover.saveSearch('testCustomESQLHistogramInvalidation', true);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');
    });

    it('should be able to load a saved search with custom histogram vis and save new customization', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // now we are changing to a different query to check invalidation logic
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5');
      await PageObjects.discover.chooseLensChart('Donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      // now we customize the vis again
      await PageObjects.discover.chooseLensChart('Waffle');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Waffle');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Waffle');
      expect(await getCurrentVisChartTitle()).to.be('Waffle');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.saveSearch(
        'testCustomESQLHistogramInvalidationPlusCustomization',
        true
      );

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Waffle');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Waffle');
      expect(await getCurrentVisChartTitle()).to.be('Waffle');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Waffle');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Waffle');
      expect(await getCurrentVisChartTitle()).to.be('Waffle');
    });

    it('should be able to customize ESQL vis and save it', async () => {
      await PageObjects.discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5');
      await PageObjects.discover.chooseLensChart('Donut');

      await PageObjects.discover.saveSearch('testCustomESQLVis');
      await PageObjects.discover.saveSearch('testCustomESQLVisDonut', true);

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');
    });

    it('should be able to load a saved search with custom vis, edit query and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      // by changing the query we reset the vis customization to histogram
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisSeriesTypeLabel()).to.be('Bar vertical stacked');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageB');

      // should be still Donut after reverting and saving again
      await PageObjects.discover.saveSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');
    });

    it('should be able to change to an unfamiliar vis type via lens flyout', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await changeVisSeriesType('Pie');

      await testSubjects.existOrFail('unsavedChangesBadge');

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Customized');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Pie');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await PageObjects.discover.saveSearch('testCustomESQLVisPie', true);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Customized');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Pie');
      expect(await getCurrentVisChartTitle()).to.be('Customized');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Customized');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Pie');
      expect(await getCurrentVisChartTitle()).to.be('Customized');

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension.raw'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Bar vertical stacked');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Customized');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Pie');
      expect(await getCurrentVisChartTitle()).to.be('Customized');
    });

    it('should be able to load a saved search with custom vis, edit vis and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVis');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensChart('Waffle');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Waffle');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Waffle');
      expect(await getCurrentVisChartTitle()).to.be('Waffle');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await PageObjects.discover.chooseLensChart('Bar vertical stacked');
      await changeVisSeriesType('Line');

      await testSubjects.existOrFail('unsavedChangesBadge');
      await PageObjects.discover.saveUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Customized');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Line');
      expect(await getCurrentVisChartTitle()).to.be('Bar vertical stacked');
    });

    it('should close lens flyout on revert changes', async () => {
      await PageObjects.discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Bar vertical stacked');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensChart('Treemap');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Treemap');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Treemap');
      expect(await getCurrentVisChartTitle()).to.be('Treemap');

      await PageObjects.discover.saveSearch('testCustomESQLVisRevert');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensChart('Donut');
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Donut');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Donut');
      expect(await getCurrentVisChartTitle()).to.be('Donut');

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization'); // open the flyout
      await testSubjects.existOrFail('lnsEditOnFlyFlyout');

      await testSubjects.existOrFail('unsavedChangesBadge');
      await PageObjects.discover.revertUnsavedChanges();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await testSubjects.missingOrFail('lnsEditOnFlyFlyout'); // it should close the flyout
      expect(await PageObjects.discover.getCurrentLensChart()).to.be('Treemap');
      expect(await getCurrentVisSeriesTypeLabel()).to.be('Treemap');
      expect(await getCurrentVisChartTitle()).to.be('Treemap');
    });
  });
}
