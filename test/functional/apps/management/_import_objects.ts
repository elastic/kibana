/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import path from 'path';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

function uniq<T>(input: T[]): T[] {
  return [...new Set(input)];
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  describe('import objects', function describeIndexTests() {
    describe('.ndjson file', () => {
      beforeEach(async function () {
        await esArchiver.load('test/functional/fixtures/es_archiver/management');
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
      });

      afterEach(async function () {
        await esArchiver.unload('test/functional/fixtures/es_archiver/management');
      });

      it('should import saved objects', async function () {
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        log.debug("check that 'Log Agents' is in table as a visualization");
        expect(await PageObjects.savedObjects.getObjectTypeByTitle('Log Agents')).to.eql(
          'visualization'
        );

        await PageObjects.savedObjects.clickRelationshipsByTitle('logstash-*');

        const flyout = keyBy(await PageObjects.savedObjects.getRelationshipFlyout(), 'title');
        log.debug(
          "check that 'Shared-Item Visualization AreaChart' shows 'logstash-*' as it's Parent"
        );
        expect(flyout['Shared-Item Visualization AreaChart'].relationship).to.eql('Parent');
        log.debug("check that 'Log Agents' shows 'logstash-*' as it's Parent");
        expect(flyout['Log Agents'].relationship).to.eql('Parent');
      });

      it('should import saved objects with circular refs', async function () {
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_circular_refs.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        await PageObjects.savedObjects.clickRelationshipsByTitle('dashboard-a');

        const flyoutContent = await PageObjects.savedObjects.getRelationshipFlyout();

        expect(uniq(flyoutContent.map(({ relationship }) => relationship).sort())).to.eql([
          'Child',
          'Parent',
        ]);
        expect(uniq(flyoutContent.map(({ title }) => title))).to.eql(['dashboard-b']);
      });

      it('should provide dialog to allow the importing of saved objects with index pattern conflicts', async function () {
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_conflicts.ndjson')
        );
        await PageObjects.savedObjects.checkImportConflictsWarning();
        await PageObjects.settings.associateIndexPattern(
          'd1e4c910-a2e6-11e7-bb30-233be9be6a15',
          'logstash-*'
        );
        await PageObjects.savedObjects.clickConfirmChanges();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.savedObjects.clickImportDone();
        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object with index pattern conflict');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should allow the user to override duplicate saved objects', async function () {
        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can override the existing visualization.
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.ndjson'),
          false
        );

        await PageObjects.savedObjects.checkImportConflictsWarning();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.savedObjects.clickConfirmChanges();

        // Override the visualization.
        await PageObjects.common.clickConfirmOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccess');
        expect(isSuccessful).to.be(true);
      });

      it('should allow the user to cancel overriding duplicate saved objects', async function () {
        // This data has already been loaded by the "visualize" esArchive. We'll load it again
        // so that we can be prompted to override the existing visualization.
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_exists.ndjson'),
          false
        );

        await PageObjects.savedObjects.checkImportConflictsWarning();
        await PageObjects.settings.associateIndexPattern('logstash-*', 'logstash-*');
        await PageObjects.savedObjects.clickConfirmChanges();

        // *Don't* override the visualization.
        await PageObjects.common.clickCancelOnModal();

        const isSuccessful = await testSubjects.exists('importSavedObjectsSuccessNoneImported');
        expect(isSuccessful).to.be(true);
      });

      it('should import saved objects linked to saved searches', async function () {
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_saved_search.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should not import saved objects linked to saved searches when saved search does not exist', async function () {
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_connected_to_saved_search.ndjson')
        );
        await PageObjects.savedObjects.checkNoneImported();
        await PageObjects.savedObjects.clickImportDone();

        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should not import saved objects linked to saved searches when saved search index pattern does not exist', async function () {
        await PageObjects.savedObjects.clickCheckboxByTitle('logstash-*');
        await PageObjects.savedObjects.clickDelete();

        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_saved_search.ndjson')
        );
        // Wait for all the saves to happen
        await PageObjects.savedObjects.checkImportConflictsWarning();
        await PageObjects.savedObjects.clickConfirmChanges();
        await PageObjects.savedObjects.clickImportDone();

        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object connected to saved search');
        expect(isSavedObjectImported).to.be(false);
      });

      it('should import saved objects with index patterns when index patterns already exists', async () => {
        // First, import the objects
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should import saved objects with index patterns when index patterns does not exists', async () => {
        // First, we need to delete the index pattern
        await PageObjects.savedObjects.clickCheckboxByTitle('logstash-*');
        await PageObjects.savedObjects.clickDelete();

        // Then, import the objects
        await PageObjects.savedObjects.importFile(
          path.join(__dirname, 'exports', '_import_objects_with_index_patterns.ndjson')
        );
        await PageObjects.savedObjects.checkImportSucceeded();
        await PageObjects.savedObjects.clickImportDone();

        const objects = await PageObjects.savedObjects.getRowTitles();
        const isSavedObjectImported = objects.includes('saved object imported with index pattern');
        expect(isSavedObjectImported).to.be(true);
      });

      it('should not allow import without a file added', async function () {
        const importActionDisabled = await PageObjects.savedObjects.importDisabled();
        expect(importActionDisabled).to.eql('true');
      });
    });
  });
}
