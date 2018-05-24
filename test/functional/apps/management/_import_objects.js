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

import expect from 'expect.js';
import path from 'path';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header']);

  describe('import objects', function describeIndexTests() {
    beforeEach(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await esArchiver.load('management');
    });

    afterEach(async function () {
      await esArchiver.unload('management');
    });

    it('should import saved objects normally', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects.json'));
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickImportDone();
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(3);
    });

    it('should import conflicts using a confirm modal', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects-conflicts.json'));
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickConfirmConflicts();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickImportDone();
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(3);
    });

    it('should allow for overrides', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();

      // Put in data which already exists
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_exists.json'), false);
      // Wait for all the saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();
      // Interact with the conflict modal
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickConfirmConflicts();
      // Now confirm we want to override
      await PageObjects.common.clickConfirmOnModal();
      // Wait for all the saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();
      // Finish the flyout
      await PageObjects.settings.clickImportDone();
      // Wait...
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(2);
    });

    it('should allow for cancelling overrides', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();

      // Put in data which already exists
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_exists.json'), false);
      // Wait for all the saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();
      // Interact with the conflict modal
      await PageObjects.settings.setImportIndexFieldOption(2);
      await PageObjects.settings.clickConfirmConflicts();
      // Now cancel the override
      await PageObjects.common.clickCancelOnModal();
      // Wait for all saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();
      // Finish the flyout
      await PageObjects.settings.clickImportDone();
      // Wait for table to refresh
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(2);
    });

    it('should handle saved searches and objects with saved searches properly', async function () {
      // First, import the saved search
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_saved_search.json'));
      // Wait for all the saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Second, we need to delete the index pattern
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickOnOnlyIndexPattern();
      await PageObjects.settings.removeIndexPattern();

      // Last, import a saved object connected to the saved search
      // This should NOT show the conflicts
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.json'));
      // Wait for all the saves to happen
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickImportDone();
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(2);
    });

    it('should work with index patterns', async () => {
      // First, import the objects
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_with_index_patterns.json'));
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickImportDone();
      // Wait for all the saves to happen
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(2);
    });

    it('should work when the index pattern does not exist', async () => {
      // First, we need to delete the index pattern
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickOnOnlyIndexPattern();
      await PageObjects.settings.removeIndexPattern();

      // Second, create it
      await PageObjects.settings.createIndexPattern('logstash-', '@timestamp');

      // Then, import the objects
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', '_import_objects_with_index_patterns.json'));
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickImportDone();
      // Wait for all the saves to happen
      await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.length).to.be(2);
    });
  });
}
