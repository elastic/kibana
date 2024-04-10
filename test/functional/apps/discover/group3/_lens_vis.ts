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
  const browser = getService('browser');
  const toasts = getService('toasts');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
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

  async function openLensEditFlyout() {
    await testSubjects.click('discoverQueryTotalHits'); // cancel any tooltips
    await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
    await retry.waitFor('flyout', async () => {
      return await testSubjects.exists('lnsChartSwitchPopover');
    });
  }

  async function changeVisShape(seriesType: string) {
    await openLensEditFlyout();
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

  async function getCurrentVisTitle() {
    await toasts.dismissAll();
    await openLensEditFlyout();
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

  describe('discover lens vis', function () {
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
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be(
        'histogramForDataView'
      );
    });

    it('should show no histogram for non-time-based data views and recover for time-based data views', async () => {
      await dataViews.createFromSearchBar({
        name: 'logs',
        adHoc: true,
        hasTimeField: true,
        changeTimestampField: `--- I don't want to use the time filter ---`,
      });
      await checkNoVis(defaultTotalCount);

      await dataViews.editFromSearchBar({ newName: 'logs', newTimeField: '@timestamp' });
      await checkHistogramVis(defaultTimespan, defaultTotalCount);
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be(
        'histogramForDataView'
      );
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

      await changeVisShape('Line');

      await PageObjects.discover.saveSearch('testCustomESQLHistogram');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      expect(await getCurrentVisTitle()).to.be('Line');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('histogramForESQL');
    });

    it('should be able to load a saved search with custom histogram vis, edit vis and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await changeVisShape('Area');
      expect(await getCurrentVisTitle()).to.be('Area');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Line');

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

      expect(await getCurrentVisTitle()).to.be('Line');

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

      expect(await getCurrentVisTitle()).to.be('Bar vertical stacked');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Line');
      await testSubjects.existOrFail('xyVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('histogramForESQL');

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
      await PageObjects.discover.chooseLensSuggestion('donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Line');
      await testSubjects.existOrFail('xyVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await checkESQLHistogramVis(defaultTimespanESQL, '10');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
    });

    it('should be able to load a saved search with custom histogram vis and handle invalidations', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Line');

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      // now we are changing to a different query to check invalidation logic
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5');
      await PageObjects.discover.chooseLensSuggestion('donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await PageObjects.discover.saveSearch('testCustomESQLHistogramInvalidation', true);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
    });

    it('should be able to load a saved search with custom histogram vis and save new customization', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLHistogram');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Line');

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
      await PageObjects.discover.chooseLensSuggestion('donut');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');

      // now we customize the vis again
      await PageObjects.discover.chooseLensSuggestion('waffle');
      expect(await getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.saveSearch(
        'testCustomESQLHistogramInvalidationPlusCustomization',
        true
      );

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');
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
      await PageObjects.discover.chooseLensSuggestion('donut');

      await PageObjects.discover.saveSearch('testCustomESQLVis');
      await PageObjects.discover.saveSearch('testCustomESQLVisDonut', true);

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
    });

    it('should be able to load a saved search with custom vis, edit query and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      // by changing the query we reset the vis customization to histogram
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Bar vertical stacked');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await testSubjects.existOrFail('unsavedChangesBadge');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageB');

      // should be still Donut after reverting and saving again
      await PageObjects.discover.saveSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');
    });

    it('should be able to change to an unfamiliar vis type via lens flyout', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVisDonut');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await changeVisShape('Pie');

      await testSubjects.existOrFail('unsavedChangesBadge');

      expect(await getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await PageObjects.discover.saveSearch('testCustomESQLVisPie', true);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension.raw'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Bar vertical stacked');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
    });

    it('should be able to load a saved search with custom vis, edit vis and revert changes', async () => {
      await PageObjects.discover.loadSavedSearch('testCustomESQLVis');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensSuggestion('waffle');
      expect(await getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await testSubjects.existOrFail('unsavedChangesBadge');

      await PageObjects.discover.revertUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');

      await PageObjects.discover.chooseLensSuggestion('barVerticalStacked');
      await changeVisShape('Line');

      await testSubjects.existOrFail('unsavedChangesBadge');
      await PageObjects.discover.saveUnsavedChanges();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      expect(await getCurrentVisTitle()).to.be('Line');
      await testSubjects.existOrFail('xyVisChart');
    });

    it('should close lens flyout on revert changes', async () => {
      await PageObjects.discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      expect(await getCurrentVisTitle()).to.be('Bar vertical stacked');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensSuggestion('treemap');
      expect(await getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await PageObjects.discover.saveSearch('testCustomESQLVisRevert');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');

      await PageObjects.discover.chooseLensSuggestion('donut');
      expect(await getCurrentVisTitle()).to.be('Donut');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await openLensEditFlyout();
      await testSubjects.existOrFail('lnsEditOnFlyFlyout');

      await testSubjects.existOrFail('unsavedChangesBadge');
      await PageObjects.discover.revertUnsavedChanges();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
      await testSubjects.missingOrFail('lnsEditOnFlyFlyout'); // it should close the flyout
      expect(await getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await PageObjects.discover.getVisContextSuggestionType()).to.be('lensSuggestion');
    });
  });
}
