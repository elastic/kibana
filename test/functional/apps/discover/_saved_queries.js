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

export default function ({ getService, getPageObjects }) {
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

  describe('saved queries as saved objects', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    describe('saved query management component functionality', function () {
      this.tags(['skipFirefox']);
      it('should show the saved query management component when there are no saved queries', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        const descriptionText = await testSubjects.getVisibleText('saved-query-management-popover');
        expect(descriptionText)
          .to
          .eql('SAVED QUERIES\nThere are no saved queries. Save query text and filters that you want to use again.\nSave');
      });
      it('should allow a query to be saved via the saved objects management component', async () => {
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery('OkResponse', '200 responses', false, true);
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
      });
      it('allow saving a currently loaded saved query as a new query via the saved query management component ', async () => {
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseCopy',
          '200 responses copy',
          true,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponseCopy');
      });

      it('allow saving changes to a currently loaded query via the saved query management component', async () => {
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('Not found', false, false);
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OkResponseCopy');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:404');
      });

      it('allows deleting saved queries in the saved query management component ', async () => {
        await savedQueryManagementComponent.deleteSavedQuery('OkResponseCopy');
        await savedQueryManagementComponent.savedQueryMissingOrFail('OkResponseCopy');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });

      it('saves a filter as part of the saved query when include filters is selected', async () => {
        await queryBar.setQuery('response:404');
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        await savedQueryManagementComponent.saveNewQuery('NotFoundForJpgs', 'Jpg not found\'s', true, false);
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('NotFoundForJpgs');
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
      });

      it('allows saving a query with a date filter', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseWithTimeFilter',
          'timefilter enabled',
          false,
          true
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponseWithTimeFilter');
      });

      it('sets the timefilter when a saved query is loaded that has a timefilter saved', async () => {
        const fromTime = '2015-09-20 06:31:44.000';
        const toTime = '2015-09-20 18:31:44.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await savedQueryManagementComponent.loadSavedQuery('OkResponseWithTimeFilter');
        const timePickerValues = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.not.eql(fromTime);
        expect(timePickerValues.end).to.not.eql(toTime);
      });
    });
  });
}
