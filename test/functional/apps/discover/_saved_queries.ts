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

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const testSubjects = getService('testSubjects');

  // Failing: See https://github.com/elastic/kibana/issues/89477
  describe.skip('saved queries saved objects', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('saved query management component functionality', function () {
      before(async function () {
        // set up a query with filters and a time filter
        log.debug('set up a query with filters to save');
        await queryBar.setQuery('response:200');
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        const fromTime = 'Sep 20, 2015 @ 08:00:00.000';
        const toTime = 'Sep 21, 2015 @ 08:00:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      });

      it('should show the saved query management component when there are no saved queries', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        const descriptionText = await testSubjects.getVisibleText('saved-query-management-popover');
        expect(descriptionText).to.eql(
          'Saved Queries\nThere are no saved queries. Save query text and filters that you want to use again.\nSave current query'
        );
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
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      it('allows saving the currently loaded query as a new query', async () => {
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseCopy',
          '200 responses',
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
        await savedQueryManagementComponent.saveNewQueryWithNameError('OkResponse');
      });

      it('does not allow saving a query with leading or trailing whitespace in the name', async () => {
        await savedQueryManagementComponent.saveNewQueryWithNameError('OkResponse ');
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
        await queryBar.switchQueryLanguage('lucene');
        await PageObjects.common.navigateToApp('discover'); // makes sure discovered is reloaded without any state in url
        await queryBar.expectQueryLanguageOrFail('lucene'); // make sure lucene is remembered after refresh (comes from localstorage)
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await queryBar.expectQueryLanguageOrFail('kql');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await queryBar.expectQueryLanguageOrFail('lucene');
      });

      it('changing language removes saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await queryBar.switchQueryLanguage('lucene');
        expect(await queryBar.getQueryString()).to.eql('');
      });
    });
  });
}
