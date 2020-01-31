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
import path from 'path';

export default function({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header']);
  const testSubjects = getService('testSubjects');

  describe('import objects', function describeIndexTests() {
    describe('.ndjson file', () => {
      beforeEach(async function() {
        // delete .kibana index and then wait for Kibana to re-create it
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
        await esArchiver.load('management');
      });

      afterEach(async function() {
        await esArchiver.unload('management');
      });

      it('should import saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('Log Agents');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should provide dialog to allow the importing of saved objects with index pattern conflicts', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_conflicts.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern(
          'd1e4c910-a2e6-11e7-bb30-233be9be6a15',
          'logstash-*'
        );
        await PageObjects.settings.clickConfirmChanges();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object with index pattern conflict');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should allow the user to override duplicate saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();

        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can override the existing visualization.
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.ndjson'),
          false
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.settings.clickConfirmChanges();

        // Override the visualization.
        await PageObjects.common.clickConfirmOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccess');
        expect(isSuccessful).to.be(true);
      });

      it('should allow the user to cancel overriding duplicate saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();

        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can be prompted to override the existing visualization.
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.ndjson'),
          false
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.settings.clickConfirmChanges();

        // *Don't* override the visualization.
        await PageObjects.common.clickCancelOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccessNoneImported');
        expect(isSuccessful).to.be(true);
      });

      it('should import saved objects linked to saved searches', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_saved_search.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();

        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should not import saved objects linked to saved searches when saved search does not exist', async function() {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should not import saved objects linked to saved searches when saved search index pattern does not exist', async function() {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.removeLogstashIndexPatternIfExist();

        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_saved_search.ndjson')
        );
        // Wait for all the saves to happen
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickConfirmChanges();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should import saved objects with index patterns when index patterns already exists', async () => {
        // First, import the objects
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        // Wait for all the saves to happen
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should import saved objects with index patterns when index patterns does not exists', async () => {
        // First, we need to delete the index pattern
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.removeLogstashIndexPatternIfExist();

        // Then, import the objects
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.ndjson')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        // Wait for all the saves to happen
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });
    });

    describe('.json file', () => {
      beforeEach(async function() {
        // delete .kibana index and then wait for Kibana to re-create it
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
        await esArchiver.load('management');
      });

      afterEach(async function() {
        await esArchiver.unload('management');
      });

      it('should import saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('Log Agents');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should provide dialog to allow the importing of saved objects with index pattern conflicts', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects-conflicts.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern(
          'd1e4c910-a2e6-11e7-bb30-233be9be6a15',
          'logstash-*'
        );
        await PageObjects.settings.clickConfirmChanges();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();
        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object with index pattern conflict');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should allow the user to override duplicate saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();

        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can override the existing visualization.
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.json'),
          false
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.settings.clickConfirmChanges();

        // Override the visualization.
        await PageObjects.common.clickConfirmOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccess');
        expect(isSuccessful).to.be(true);
      });

      it('should allow the user to cancel overriding duplicate saved objects', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();

        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can be prompted to override the existing visualization.
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.json'),
          false
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.settings.clickConfirmChanges();

        // *Don't* override the visualization.
        await PageObjects.common.clickCancelOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccessNoneImported');
        expect(isSuccessful).to.be(true);
      });

      it('should import saved objects linked to saved searches', async function() {
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_saved_search.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();

        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should not import saved objects linked to saved searches when saved search does not exist', async function() {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should not import saved objects linked to saved searches when saved search index pattern does not exist', async function() {
        // First, import the saved search
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_saved_search.json')
        );
        // Wait for all the saves to happen
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();

        // Second, we need to delete the index pattern
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.removeLogstashIndexPatternIfExist();

        // Last, import a saved object connected to the saved search
        // This should NOT show the conflicts
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.json')
        );
        // Wait for all the saves to happen
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should import saved objects with index patterns when index patterns already exists', async () => {
        // First, import the objects
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        // Wait for all the saves to happen
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should import saved objects with index patterns when index patterns does not exists', async () => {
        // First, we need to delete the index pattern
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.removeLogstashIndexPatternIfExist();

        // Then, import the objects
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.settings.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.json')
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.clickImportDone();
        // Wait for all the saves to happen
        await PageObjects.settings.waitUntilSavedObjectsTableIsNotLoading();

        const objects = await PageObjects.settings.getSavedObjectsInTable();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });
    });
  });
}
