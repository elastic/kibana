/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');
  const { common, header, home, graph } = getPageObjects(['common', 'header', 'home', 'graph']);

  describe('Graph app a11y tests', () => {
    before(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.addSampleDataSet('flights');
      await common.navigateToApp('graph');
    });

    after(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.removeSampleDataSet('flights');
    });

    it('Graph listing page', async function () {
      await a11y.testAppSnapshot();
    });

    it('Edit Graph page', async function () {
      await testSubjects.click('graphListingTitleLink-Kibana-Sample-Data---Flights');
      await a11y.testAppSnapshot();
    });

    it('Syntax options panel', async function () {
      await testSubjects.click('switchQueryLanguageButton');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('Add fields panel', async function () {
      await testSubjects.click('graph-add-field-button');
      await retry.waitFor(
        'Add fields panel is visible',
        async () => await testSubjects.exists('graph-add-field-button')
      );
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('Graph save panel', async function () {
      await testSubjects.click('graphSaveButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('saveCancelButton');
    });

    describe('Graph settings', () => {
      before(async () => {
        await graph.clickSettingsButton();
        await testSubjects.existOrFail('advancedSettings');
      });

      after(async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        await testSubjects.missingOrFail('graphSettingsFlyout');
      });

      it('advanced settings tab', async function () {
        await a11y.testAppSnapshot();
      });

      it('block list tab', async function () {
        await testSubjects.click('blocklist');
        await a11y.testAppSnapshot();
      });

      it('drilldowns tab', async function () {
        await testSubjects.click('drillDowns');
        await a11y.testAppSnapshot();
      });

      it('drilldown tab - add new drilldown', async function () {
        await testSubjects.click('drillDowns');
        await testSubjects.click('graphAddNewTemplate');
        await a11y.testAppSnapshot();
      });
    });

    // Mocha runs a suite's own tests before its nested suites, so this needs its own suite to keep
    // running after 'Graph settings': it discards the datasource, disabling the settings button.
    describe('Create new graph', () => {
      it('Create new graph page', async function () {
        await testSubjects.click('graphNewButton');
        await testSubjects.click('confirmModalConfirmButton');
        await a11y.testAppSnapshot();
      });
    });
  });
}
