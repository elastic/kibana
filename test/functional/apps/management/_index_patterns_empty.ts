/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'settings']);
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const es = getService('legacyEs');

  describe('index pattern empty view', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('makelogs');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
      await esArchiver.loadIfNeeded('makelogs');
      // @ts-expect-error
      await es.transport.request({
        path: '/logstash-a',
        method: 'DELETE',
      });
    });

    // create index pattern and return to verify list
    it(`shows empty views`, async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      log.debug(
        `\n\nNOTE: If this test fails make sure there aren't any non-system indices in the _cat/indices output (use esArchiver.unload on them)`
      );
      log.debug(
        // @ts-expect-error
        await es.transport.request({
          path: '/_cat/indices',
          method: 'GET',
        })
      );
      await testSubjects.existOrFail('createAnyway');
      // @ts-expect-error
      await es.transport.request({
        path: '/logstash-a/_doc',
        method: 'POST',
        body: { user: 'matt', message: 20 },
      });
      await testSubjects.click('refreshIndicesButton');
      await testSubjects.existOrFail('createIndexPatternButton', { timeout: 5000 });
      await PageObjects.settings.createIndexPattern('logstash-*', '');
    });

    it(`doesn't show read-only badge`, async () => {
      await globalNav.badgeMissingOrFail();
    });
  });
}
