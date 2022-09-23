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
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header']);

  const defaultSettings = {
    default_route: 'app/home',
  };

  describe('overview page - footer', function describeIndexTests() {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await kibanaServer.uiSettings.replace(defaultSettings);
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
    });

    it('clicking footer updates landing page', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      let footerButton = await find.byCssSelector('.kbnOverviewPageFooter__button');
      await footerButton.click();

      await retry.try(async () => {
        footerButton = await find.byCssSelector('.kbnOverviewPageFooter__button');
        const text = await (
          await footerButton.findByCssSelector('.euiButtonEmpty__text')
        ).getVisibleText();
        expect(text.toString().includes('Display a different page on log in')).to.be(true);
      });
    });
  });
}
