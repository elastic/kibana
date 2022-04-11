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
  const esArchiver = getService('esArchiver');
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

  const from = 'Sep 20, 2015 @ 08:00:00.000';
  const to = 'Sep 21, 2015 @ 08:00:00.000';

  const setUpQueriesWithFilters = async () => {
    await kibanaServer.savedObjects.clean({ types: ['search', 'query'] });
    // set up a query with filters and a time filter
    log.debug('set up a query with filters to save');
    await PageObjects.common.setTime({ from, to });
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('logstash-*');
    await retry.try(async function tryingForTime() {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('4,731');
    });

    await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
    await retry.try(async function tryingForTime() {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('3,029');
    });

    await queryBar.setQuery('response:200');
    await queryBar.submitQuery();
    await retry.try(async function tryingForTime() {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('2,792');
    });
  };

  describe('saved queries saved objects', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern', 'query'] });

      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/date_nested.json'
      );
      await esArchiver.load('test/functional/fixtures/es_archiver/date_nested');
      await esArchiver.load('test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/date_nested');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern', 'query'] });
      await kibanaServer.savedObjects.clean({ types: ['search', 'query'] });
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nested');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
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

        await PageObjects.discover.selectIndexPattern('date-nested');

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        await PageObjects.discover.selectIndexPattern('logstash-*');
        const currentDataView = await PageObjects.discover.getCurrentlySelectedDataView();
        expect(currentDataView).to.be('logstash-*');
        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be('4,731');
        });

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

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
        expect(timePickerValues.start).to.eql(from);
        expect(timePickerValues.end).to.eql(to);
      });

      it('preserves the currently loaded query when the page is reloaded', async () => {
        await browser.refresh();
        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.eql(from);
        expect(timePickerValues.end).to.eql(to);
        await retry.waitForWithTimeout('the right hit count', 65000, async () => {
          const hitCount = await PageObjects.discover.getHitCount();
          log.debug(`Found hit count is ${hitCount}. Looking for 2,792.`);
          return hitCount === '2,792';
        });
        expect(await savedQueryManagementComponent.getCurrentlyLoadedQueryID()).to.be('OkResponse');
      });

      it('allows saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
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
