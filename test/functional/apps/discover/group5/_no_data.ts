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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  describe('discover no data', () => {
    const kbnDirectory = 'test/functional/fixtures/kbn_archiver/discover';

    before(async function () {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      log.debug('load kibana with no data');
      await kibanaServer.importExport.unload(kbnDirectory);
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('when no data opens integrations', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();

      const addIntegrations = await testSubjects.find('kbnOverviewAddIntegrations');
      await addIntegrations.click();
      await PageObjects.common.waitUntilUrlIncludes('integrations/browse');
    });

    it('adds a new data view when no data views', async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await PageObjects.common.navigateToApp('discover');

      const dataViewToCreate = 'logstash';
      await dataViews.createFromPrompt({ name: dataViewToCreate });
      await dataViews.waitForSwitcherToBe(`${dataViewToCreate}*`);
    });

    it('skips to Discover to try ES|QL', async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': '{  "from": "2015-09-18T19:37:13.000Z",  "to": "now"}',
      });
      await PageObjects.common.navigateToApp('discover');

      await testSubjects.click('tryESQLLink');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.existOrFail('TextBasedLangEditor');
      await testSubjects.existOrFail('unifiedHistogramChart');
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    });
  });
}
