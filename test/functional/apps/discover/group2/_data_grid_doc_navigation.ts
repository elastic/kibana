/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context', 'settings']);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const security = getService('security');
  const defaultSettings = { defaultIndex: 'logstash-*' };

  const createIndex = (indexName: string) => {
    return es.transport.request({
      path: `/${indexName}/_doc/1`,
      method: 'PUT',
      body: {
        username: 'Dmitry',
        '@timestamp': '2015-09-21T09:30:23',
        message: 'hello',
      },
    });
  };

  describe('discover data grid doc link', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await security.testUser.setRoles(['kibana_admin', 'similar_index', 'similar_index_two']);

      await createIndex('similar_index');
      await createIndex('similar_index_two');

      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('similar_index*', '@timestamp', true);
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });

    it('should navigate through rows with the same id but different indices correctly', async () => {
      await PageObjects.discover.selectIndexPattern('similar_index*');

      await dataGrid.clickRowToggle();
      const indexBeforePaginating = await testSubjects.getVisibleText(
        'tableDocViewRow-_index-value'
      );
      expect(indexBeforePaginating).to.be('similar_index');

      await testSubjects.click('pagination-button-next');
      const indexAfterPaginating = await testSubjects.getVisibleText(
        'tableDocViewRow-_index-value'
      );
      expect(indexAfterPaginating).to.be('similar_index_two');
    });

    it('should open the doc view of the selected document', async function () {
      // navigate to the doc view
      await dataGrid.clickRowToggle({ rowIndex: 0 });

      // click the open action
      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[0].click();
      });

      await retry.waitFor('hit loaded', async () => {
        const hasDocHit = await testSubjects.exists('doc-hit');
        return !!hasDocHit;
      });
    });

    it('should create an exists filter from doc view of the selected document', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await testSubjects.click('openFieldActionsButton-@timestamp');
      await testSubjects.click('addExistsFilterButton-@timestamp');

      const hasExistsFilter = await filterBar.hasFilter('@timestamp', 'exists', true, false, false);
      expect(hasExistsFilter).to.be(true);
    });
  });
}
