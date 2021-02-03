/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const es = getService('legacyEs');
  const PageObjects = getPageObjects(['settings', 'common']);
  const security = getService('security');

  describe('"Create Index Pattern" wizard', function () {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    describe('step 1 next button', function () {
      it('is disabled by default', async function () {
        await (await testSubjects.find('createIndexPatternButton')).click();
        const btn = await PageObjects.settings.getCreateIndexPatternGoToStep2Button();
        const isEnabled = await btn.isEnabled();
        expect(isEnabled).not.to.be.ok();
      });

      it('is enabled once an index pattern with matching indices has been entered', async function () {
        await PageObjects.settings.setIndexPatternField();
        await PageObjects.common.sleep(1000);
        const btn = await PageObjects.settings.getCreateIndexPatternGoToStep2Button();
        const isEnabled = await btn.isEnabled();
        expect(isEnabled).to.be.ok();
      });
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

        await PageObjects.settings.createIndexPattern('alias1', false);
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
