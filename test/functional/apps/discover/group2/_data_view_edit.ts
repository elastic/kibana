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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const es = getService('es');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'unifiedSearch',
    'discover',
    'timePicker',
    'dashboard',
  ]);

  describe('data view flyout', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setCommonlyUsedTime('This_week');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await es.transport.request({
        path: '/my-index-000001',
        method: 'DELETE',
      });
      await es.transport.request({
        path: '/my-index-000002',
        method: 'DELETE',
      });
    });

    it('create data view', async function () {
      const initialPattern = 'my-index-';
      await es.transport.request({
        path: '/my-index-000001/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          a: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await es.transport.request({
        path: '/my-index-000002/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          b: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await PageObjects.discover.createAdHocDataView(initialPattern, true);
      expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.be(`${initialPattern}*`);
      await PageObjects.discover.waitUntilSidebarHasLoaded();

      expect(await PageObjects.discover.getHitCountInt()).to.be(2);
      expect((await PageObjects.discover.getAllFieldNames()).length).to.be(3);
    });

    it('update data view', async function () {
      const updatedPattern = 'my-index-000001';
      await PageObjects.discover.clickIndexPatternActions();
      await PageObjects.unifiedSearch.editDataView(updatedPattern);

      await retry.try(async () => {
        expect(await PageObjects.discover.getHitCountInt()).to.be(1);
      });
      expect((await PageObjects.discover.getAllFieldNames()).length).to.be(2);
    });
  });
}
