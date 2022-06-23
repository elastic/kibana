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
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('overview page - solutions', function describeIndexTests() {
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

    it('contains the appropriate solutions', async () => {
      const solutionCards = await find.allByCssSelector('.kbnOverviewMore__item');
      expect(solutionCards.length).to.be(2);

      const observabilityImage = await solutionCards[0].findByCssSelector('img');
      const observabilityImageUrl = await observabilityImage.getAttribute('src');
      expect(observabilityImageUrl.includes('/solutions_observability.svg')).to.be(true);

      const securityImage = await solutionCards[1].findByCssSelector('img');
      const securityImageUrl = await securityImage.getAttribute('src');
      expect(securityImageUrl.includes('/solutions_security_solution.svg')).to.be(true);
    });

    it('click on Observability card leads to Observability', async () => {
      let solutionCards: string | any[] = [];
      await retry.waitForWithTimeout('all solutions to be present', 5000, async () => {
        solutionCards = await find.allByCssSelector('.kbnOverviewMore__item');
        return solutionCards.length === 2;
      });
      await solutionCards[0].click();
      await PageObjects.common.waitUntilUrlIncludes('app/observability');
    });

    it('click on Security card leads to Security', async () => {
      await PageObjects.common.navigateToUrl('kibana_overview', '', { useActualUrl: true });
      await PageObjects.header.waitUntilLoadingHasFinished();

      let solutionCards: string | any[] = [];
      await retry.waitForWithTimeout('all solutions to be present', 5000, async () => {
        solutionCards = await find.allByCssSelector('.kbnOverviewMore__item');
        return solutionCards.length === 2;
      });
      await solutionCards[1].click();
      await PageObjects.common.waitUntilUrlIncludes('app/security');
    });
  });
}
