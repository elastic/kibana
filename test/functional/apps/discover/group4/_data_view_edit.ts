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
  const dataViews = getService('dataViews');

  const PageObjects = getPageObjects([
    'common',
    'unifiedSearch',
    'discover',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
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
      await es.transport.request({
        path: '/my-index-000003',
        method: 'DELETE',
      });
    });

    it('create ad hoc data view', async function () {
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

      await dataViews.createFromSearchBar({
        name: initialPattern,
        adHoc: true,
        hasTimeField: true,
      });

      await retry.waitFor('current data view to get updated', async () => {
        return (await PageObjects.discover.getCurrentlySelectedDataView()) === `${initialPattern}*`;
      });
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

      expect(await PageObjects.discover.getHitCountInt()).to.be(2);
      expect((await PageObjects.unifiedFieldList.getAllFieldNames()).length).to.be(3);
    });

    it('create saved data view', async function () {
      const updatedPattern = 'my-index-000001';
      await dataViews.createFromSearchBar({
        name: updatedPattern,
        adHoc: false,
        hasTimeField: true,
      });

      await retry.try(async () => {
        expect(await PageObjects.discover.getHitCountInt()).to.be(1);
      });

      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      expect((await PageObjects.unifiedFieldList.getAllFieldNames()).length).to.be(2);
    });

    it('update data view with a different time field', async function () {
      const updatedPattern = 'my-index-000003';
      await es.transport.request({
        path: '/my-index-000003/_doc',
        method: 'POST',
        body: {
          timestamp: new Date('1970-01-01').toISOString(),
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
      });
      for (let i = 0; i < 3; i++) {
        await es.transport.request({
          path: '/my-index-000003/_doc',
          method: 'POST',
          body: {
            timestamp: new Date().toISOString(),
            c: 'GET /search HTTP/1.1 200 1070000',
            d: 'GET /search HTTP/1.1 200 1070000',
          },
        });
      }
      await dataViews.editFromSearchBar({ newName: updatedPattern, newTimeField: 'timestamp' });
      await retry.try(async () => {
        expect(await PageObjects.discover.getHitCountInt()).to.be(3);
      });
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      expect((await PageObjects.unifiedFieldList.getAllFieldNames()).length).to.be(3);
      expect(await PageObjects.discover.isChartVisible()).to.be(true);
      expect(await PageObjects.timePicker.timePickerExists()).to.be(true);
    });

    it('update data view with no time field', async function () {
      await dataViews.editFromSearchBar({
        newTimeField: "--- I don't want to use the time filter ---",
      });
      await retry.try(async () => {
        expect(await PageObjects.discover.getHitCountInt()).to.be(4);
      });
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      expect((await PageObjects.unifiedFieldList.getAllFieldNames()).length).to.be(3);
      expect(await PageObjects.discover.isChartVisible()).to.be(false);
      expect(await PageObjects.timePicker.timePickerExists()).to.be(false);
    });
  });
}
