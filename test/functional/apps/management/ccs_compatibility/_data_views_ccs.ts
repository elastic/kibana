/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const security = getService('security');

  describe('data views ccs', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin']);
    });

    describe('index pattern wizard ccs', () => {
      describe('remote cluster only', async () => {
        beforeEach(async function () {
          await kibanaServer.uiSettings.replace({});
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaIndexPatterns();
        });
        it('create index pattern using remote name', async () => {
          await PageObjects.settings.createIndexPattern('ftr-remote:logstash*', null);
          await PageObjects.settings.clickKibanaIndexPatterns();
          const indexPatternList = await PageObjects.settings.getIndexPatternList();
          expect(indexPatternList.length).to.eql(1);
        });
        it('create index pattern with wildcards in remote name', async () => {
          await PageObjects.settings.createIndexPattern('*t*-remo*:log*', null);
          await PageObjects.settings.clickKibanaIndexPatterns();
          const indexPatternList = await PageObjects.settings.getIndexPatternList();
          expect(indexPatternList.length).to.eql(1);
        });

        afterEach(async () => {
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.exists('indexPatternTable');
          await kibanaServer.savedObjects.cleanStandardList();
        });
      });
      describe('remote and local clusters', async () => {
        before(async () => {
          await es.transport.request({
            path: '/blogs/_doc',
            method: 'POST',
            body: { user: 'cuffs', message: 20 },
          });
        });

        beforeEach(async function () {
          // delete .kibana index and then wait for Kibana to re-create it
          await kibanaServer.uiSettings.replace({});
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaIndexPatterns();
        });
        it('combined remote cluster and local cluster data view without wildcards', async () => {
          await PageObjects.settings.createIndexPattern('blog*, ftr-remote:log*', null);
          await PageObjects.settings.clickKibanaIndexPatterns();
          const indexPatternList = await PageObjects.settings.getIndexPatternList();
          expect(indexPatternList.length).to.eql(1);
        });
        it('combined remote cluster and local cluster data view with wildcards', async () => {
          await PageObjects.settings.createIndexPattern('blog*, *t*-remo*:lo*', null);
          await PageObjects.settings.clickKibanaIndexPatterns();
          const indexPatternList = await PageObjects.settings.getIndexPatternList();
          expect(indexPatternList.length).to.eql(1);
        });

        afterEach(async () => {
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.exists('indexPatternTable');
          await kibanaServer.savedObjects.cleanStandardList();
        });
        after(async () => {
          await es.transport.request({
            path: '/blogs',
            method: 'DELETE',
          });
        });
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });
    });
  });
}
