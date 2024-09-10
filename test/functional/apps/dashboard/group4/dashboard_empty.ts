/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker']);

  describe('dashboard empty state', () => {
    const kbnDirectory = 'test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

    before(async function () {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      log.debug('load kibana with no data');
      await kibanaServer.importExport.unload(kbnDirectory);
      await PageObjects.dashboard.navigateToApp();
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('Opens the integrations page when there is no data', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();

      const addIntegrations = await testSubjects.find('kbnOverviewAddIntegrations');
      await addIntegrations.click();
      await PageObjects.common.waitUntilUrlIncludes('integrations/browse');
    });

    it('adds a new data view when no data views', async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });

      // create the new data view from the dashboards/create route in order to test that the dashboard is loaded properly as soon as the data view is created...
      await PageObjects.common.navigateToApp('dashboards', { hash: '/create' });

      const dataViewToCreate = 'logstash';
      await dataViews.createFromPrompt({ name: dataViewToCreate });
      await retry.waitForWithTimeout(
        'filter manager to be able to create a filter with the new data view',
        5000,
        async () => {
          await testSubjects.click('addFilter');
          const fields = await filterBar.getFilterEditorFields();
          await filterBar.ensureFieldEditorModalIsClosed();
          return fields.length > 0;
        }
      );
    });
  });
}
