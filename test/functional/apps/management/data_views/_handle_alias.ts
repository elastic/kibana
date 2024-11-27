/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');

  // Failing: See https://github.com/elastic/kibana/issues/201744
  describe.skip('Index patterns on aliases', function () {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_alias_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/alias');
      await es.indices.updateAliases({
        body: {
          actions: [
            { add: { index: 'test1', alias: 'alias1' } },
            { add: { index: 'test2', alias: 'alias1' } },
            { add: { index: 'test3', alias: 'alias1' } },
            { add: { index: 'test4', alias: 'alias1' } },
            { add: { index: 'test5', alias: 'alias2' } },
            { add: { index: 'test6', alias: 'alias2' } },
            { add: { index: 'test7', alias: 'alias2' } },
            { add: { index: 'test8', alias: 'alias2' } },
            { add: { index: 'test9', alias: 'alias2' } },
          ],
        },
      });
    });

    it('should be able to create index pattern without time field', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('alias1*', null);
    });

    it('should be able to discover and verify no of hits for alias1', async function () {
      const expectedHitCount = '4';
      await PageObjects.common.navigateToApp('discover');
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    it('should be able to create index pattern with timefield', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('alias2*', 'date');
    });

    describe('discover verify hits', () => {
      before(async () => {
        const from = 'Nov 12, 2016 @ 05:00:00.000';
        const to = 'Nov 19, 2016 @ 05:00:00.000';
        await PageObjects.common.setTime({ from, to });
      });

      it('should be able to discover and verify no of hits for alias2', async function () {
        const expectedHitCount = '5';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('alias2*');

        await retry.waitForWithTimeout('expected hit count to be 5', 30000, async () => {
          return (await PageObjects.discover.getHitCount()) === expectedHitCount;
        });
      });

      after(async () => {
        await PageObjects.common.unsetTime();
        await security.testUser.restoreDefaults();
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('test/functional/fixtures/es_archiver/alias');
      });
    });
  });
}
