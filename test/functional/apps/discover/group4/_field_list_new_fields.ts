/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const dataViews = getService('dataViews');
  const { common, discover, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);

  describe('Field list new fields in background handling', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await common.navigateToApp('discover');
      await timePicker.setCommonlyUsedTime('This_week');
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

      await dataViews.createFromSearchBar({
        name: initialPattern,
        adHoc: true,
        hasTimeField: true,
      });
      await dataViews.waitForSwitcherToBe(`${initialPattern}*`);
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      expect(await discover.getHitCountInt()).to.be(1);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
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
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        return (await discover.getHitCountInt()) === 2;
      });

      expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
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

      await dataViews.createFromSearchBar({
        name: initialPattern,
        adHoc: true,
        hasTimeField: true,
      });
      await dataViews.waitForSwitcherToBe(`${initialPattern}*`);
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      expect(await discover.getHitCountInt()).to.be(1);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
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
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        return (await discover.getHitCountInt()) === 2;
      });

      expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).to.eql([
        '@timestamp',
        'a',
      ]);
    });
  });
}
