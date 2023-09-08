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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard']);

  describe('overview page - page header', function describeIndexTests() {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
    });

    it('click on integrations leads to integrations', async () => {
      const header = await find.byCssSelector('.euiPageHeaderContent');
      const items = await header.findAllByCssSelector('.kbnRedirectCrossAppLinks');
      expect(items!.length).to.be(3);

      const integrations = await items!.at(2);
      await integrations!.click();
      await PageObjects.common.waitUntilUrlIncludes('app/integrations/browse');
    });

    it('click on management leads to management', async () => {
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();

      const header = await find.byCssSelector('.euiPageHeaderContent');
      const items = await header.findAllByCssSelector('.kbnRedirectCrossAppLinks');

      const management = await items!.at(1);
      await management!.click();
      await PageObjects.common.waitUntilUrlIncludes('app/management');
    });

    it('click on dev tools leads to dev tools', async () => {
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();

      const header = await find.byCssSelector('.euiPageHeaderContent');
      const items = await header.findAllByCssSelector('.kbnRedirectCrossAppLinks');

      const devTools = await items!.at(0);
      await devTools!.click();
      await PageObjects.common.waitUntilUrlIncludes('app/dev_tools');
    });
  });
}
