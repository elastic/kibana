/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('overview page - no data', function describeIndexTests() {
    before(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('should display no data page', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      const exists = await find.byClassName('kbnNoDataPageContents');
      expect(exists).not.to.be(undefined);
    });

    it('click on add data opens integrations', async () => {
      const addIntegrations = await testSubjects.find('kbnOverviewAddIntegrations');
      await addIntegrations.click();
      await PageObjects.common.waitUntilUrlIncludes('integrations/browse');
    });
  });
}
