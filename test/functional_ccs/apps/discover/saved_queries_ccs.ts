/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const remoteEsArchiver = getService('remoteEsArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const testSubjects = getService('testSubjects');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  const setUpQueriesWithFilters = async () => {
    // set up a query with filters and a time filter
    log.debug('set up a query with filters to save');
    const from = 'Sep 20, 2015 @ 08:00:00.000';
    const to = 'Sep 21, 2015 @ 08:00:00.000';
    await PageObjects.common.setTime({ from, to });
    await PageObjects.common.navigateToApp('discover');
    await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
    await queryBar.setQuery('response:200');
  };

  describe('saved queries saved objects', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });

      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/discover_ccs.json'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/date_nested_ccs.json'
      );
      await remoteEsArchiver.load('test/functional/fixtures/es_archiver/date_nested');
      await remoteEsArchiver.load('test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover_ccs');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/date_nested_ccs'
      );
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/date_nested');
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await PageObjects.common.unsetTime();
    });

    describe('saved query selection', () => {
      before(async () => await setUpQueriesWithFilters());

      it(`should unselect saved query when navigating to a 'new'`, async function () {
        await savedQueryManagementComponent.saveNewQuery(
          'test-unselect-saved-query',
          'mock',
          true,
          true
        );

        await queryBar.submitQuery();

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.eql('response:200');

        await PageObjects.discover.clickNewSearchButton();

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        await PageObjects.discover.selectIndexPattern('ftr-remote:date-nested');

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        await PageObjects.discover.selectIndexPattern('ftr-remote:logstash-*');

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await testSubjects.click('saved-query-management-load-button');

        // reset state
        await savedQueryManagementComponent.deleteSavedQuery('test-unselect-saved-query');
      });
    });

    describe('saved query management component functionality', function () {
      before(async () => await setUpQueriesWithFilters());

      it('should show the saved query management load button as disabled when there are no saved queries', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        const loadFilterSetBtn = await testSubjects.find('saved-query-management-load-button');
        const isDisabled = await loadFilterSetBtn.getAttribute('disabled');
        expect(isDisabled).to.equal('true');
      });

      it('should allow a query to be saved via the saved objects management component', async () => {
        await savedQueryManagementComponent.saveNewQuery(
          'OkResponse',
          '200 responses for .jpg over 24 hours',
          true,
          true
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        await savedQueryManagementComponent.savedQueryTextExist('response:200');
      });

      it('reinstates filters and the time filter when a saved query has filters and a time filter included', async () => {
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.not.eql(PageObjects.timePicker.defaultStartTime);
        expect(timePickerValues.end).to.not.eql(PageObjects.timePicker.defaultEndTime);
      });

      it('preserves the currently loaded query when the page is reloaded', async () => {
        await browser.refresh();
        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.not.eql(PageObjects.timePicker.defaultStartTime);
        expect(timePickerValues.end).to.not.eql(PageObjects.timePicker.defaultEndTime);
        await retry.waitFor(
          'the right hit count',
          async () => (await PageObjects.discover.getHitCount()) === '2,792'
        );
        expect(await savedQueryManagementComponent.getCurrentlyLoadedQueryID()).to.be('OkResponse');
      });

      it('allows saving changes to a currently loaded query via the saved query management component', async () => {
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('OkResponse', false, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        const contextMenuPanelTitleButton = await testSubjects.exists(
          'contextMenuPanelTitleButton'
        );
        if (contextMenuPanelTitleButton) {
          await testSubjects.click('contextMenuPanelTitleButton');
        }
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      it('allows saving the currently loaded query as a new query', async () => {
        await queryBar.setQuery('response:400');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseCopy',
          '400 responses',
          false,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponseCopy');
      });

      it('allows deleting the currently loaded saved query in the saved query management component and clears the query', async () => {
        await savedQueryManagementComponent.deleteSavedQuery('OkResponseCopy');
        await savedQueryManagementComponent.savedQueryMissingOrFail('OkResponseCopy');
        expect(await queryBar.getQueryString()).to.eql('');
      });

      it('does not allow saving a query with a non-unique name', async () => {
        // this check allows this test to run stand alone, also should fix occacional flakiness
        const savedQueryExists = await savedQueryManagementComponent.savedQueryExist('OkResponse');
        if (!savedQueryExists) {
          await savedQueryManagementComponent.saveNewQuery(
            'OkResponse',
            '200 responses for .jpg over 24 hours',
            true,
            true
          );
          await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        }
        await queryBar.setQuery('response:400');
        await savedQueryManagementComponent.saveNewQueryWithNameError('OkResponse');
      });

      it('resets any changes to a loaded query on reloading the same saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await queryBar.setQuery('response:503');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
      });

      it('allows clearing if non default language was remembered in localstorage', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.switchQueryLanguage('lucene');
        await PageObjects.common.navigateToApp('discover'); // makes sure discovered is reloaded without any state in url
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('lucene'); // make sure lucene is remembered after refresh (comes from localstorage)
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('kql');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('lucene');
      });

      it('changing language removes saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.switchQueryLanguage('lucene');
        expect(await queryBar.getQueryString()).to.eql('');
      });
    });
  });
}
