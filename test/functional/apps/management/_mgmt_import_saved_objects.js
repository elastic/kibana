/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);

  //in 6.4.0 bug the Saved Search conflict would be resolved and get imported but the visualization
  //that referenced the saved search was not imported.( https://github.com/elastic/kibana/issues/22238)

  describe('mgmt saved objects', function describeIndexTests() {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.settings.navigateTo();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.clean({ types: ['search', 'visualization'] });
    });

    it('should import saved objects mgmt', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'mgmt_import_objects.json')
      );
      await PageObjects.settings.associateIndexPattern(
        '4c3f3c30-ac94-11e8-a651-614b2788174a',
        'logstash-*'
      );
      await PageObjects.savedObjects.clickConfirmChanges();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      //instead of asserting on count- am asserting on the titles- which is more accurate than count.
      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('mysavedsearch')).to.be(true);
      expect(objects.includes('mysavedviz')).to.be(true);
    });
  });
}
