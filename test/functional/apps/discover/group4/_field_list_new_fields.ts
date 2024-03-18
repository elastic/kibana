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
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'unifiedFieldList']);

  describe('Field list new fields in background handling', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

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

    it('Check that new ingested fields are added to the available fields section', async function () {
      const initialPattern = 'my-index-';
      await es.transport.request({
        path: '/my-index-000001/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          a: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await PageObjects.discover.createAdHocDataView(initialPattern, true);

      await retry.waitFor('current data view to get updated', async () => {
        return (await PageObjects.discover.getCurrentlySelectedDataView()) === `${initialPattern}*`;
      });
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

      expect(await PageObjects.discover.getHitCountInt()).to.be(1);
      expect(await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
        '@timestamp',
        'a',
      ]);

      await es.transport.request({
        path: '/my-index-000001/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          b: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await retry.waitFor('the new record was found', async () => {
        await queryBar.submitQuery();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        return (await PageObjects.discover.getHitCountInt()) === 2;
      });

      expect(await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
        '@timestamp',
        'a',
        'b',
      ]);
    });

    it("Mapped fields without values aren't shown", async function () {
      const initialPattern = 'my-index-000002';
      await es.transport.request({
        path: '/my-index-000002/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          a: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await PageObjects.discover.createAdHocDataView(initialPattern, true);

      await retry.waitFor('current data view to get updated', async () => {
        return (await PageObjects.discover.getCurrentlySelectedDataView()) === `${initialPattern}*`;
      });
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

      expect(await PageObjects.discover.getHitCountInt()).to.be(1);
      expect(await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
        '@timestamp',
        'a',
      ]);

      await es.transport.request({
        path: '/my-index-000002/_mapping',
        method: 'PUT',
        body: {
          properties: {
            b: {
              type: 'keyword',
            },
          },
        },
      });

      // add new doc and check for it to make sure we're looking at fresh results
      await es.transport.request({
        path: '/my-index-000002/_doc',
        method: 'POST',
        body: {
          '@timestamp': new Date().toISOString(),
          a: 'GET /search HTTP/1.1 200 1070000',
        },
      });

      await retry.waitFor('the new record was found', async () => {
        await queryBar.submitQuery();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        return (await PageObjects.discover.getHitCountInt()) === 2;
      });

      expect(await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
        '@timestamp',
        'a',
      ]);
    });
  });
}
