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

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const testSubjects = getService('testSubjects');

  describe('saved queries saved objects', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function() {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    describe('saved query management component functionality', function() {
      before(async function() {
        // set up a query with filters and a time filter
        log.debug('set up a query with filters to save');
        await queryBar.setQuery('response:200');
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        const fromTime = '2015-09-20 08:00:00.000';
        const toTime = '2015-09-21 08:00:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      });

      it('should show the saved query management component when there are no saved queries', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        const descriptionText = await testSubjects.getVisibleText('saved-query-management-popover');
        expect(descriptionText).to.eql(
          'SAVED QUERIES\nThere are no saved queries. Save query text and filters that you want to use again.\nSave current query'
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
      });

      it('reinstates filters and the time filter when a saved query has filters and a time filter included', async () => {
        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.not.eql(fromTime);
        expect(timePickerValues.end).to.not.eql(toTime);
      });

      it('allows saving changes to a currently loaded query via the saved query management component', async () => {
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'OkResponse',
          '404 responses',
          false,
          false
        );
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
    });
  });
}
