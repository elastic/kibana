/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const security = getService('security');

  describe('"Create Index Pattern" wizard', function () {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    describe('index alias', () => {
      before(async function () {
        await security.testUser.setRoles(['kibana_admin', 'test_alias1_reader']);
      });
      it('can be an index pattern', async () => {
        await es.transport.request({
          path: '/blogs/_doc',
          method: 'POST',
          body: { user: 'matt', message: 20 },
        });

        await es.transport.request({
          path: '/_aliases',
          method: 'POST',
          body: { actions: [{ add: { index: 'blogs', alias: 'alias1' } }] },
        });

        await PageObjects.settings.createIndexPattern('alias1', null);
      });

      it('can delete an index pattern', async () => {
        await PageObjects.settings.removeIndexPattern();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.exists('indexPatternTable');
      });

      after(async () => {
        await es.transport.request({
          path: '/_aliases',
          method: 'POST',
          body: { actions: [{ remove: { index: 'blogs', alias: 'alias1' } }] },
        });
        await es.transport.request({
          path: '/blogs',
          method: 'DELETE',
        });
        await security.testUser.restoreDefaults();
      });
    });
  });
}
