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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('overview page - Analytics apps', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      log.debug('Navigating to kibana_overview...');
      await PageObjects.common.navigateToApp('kibana_overview');
      log.debug('Waiting until loading has finished...');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
    });

    const apps = ['dashboard', 'discover', 'canvas', 'maps', 'ml'];

    it('should display Analytics apps cards', async () => {
      const kbnOverviewAppsCards = await find.allByCssSelector('.kbnOverviewApps__item');
      expect(kbnOverviewAppsCards.length).to.be(apps.length);

      const verifyImageUrl = async (imgName: string) => {
        let found = false;
        for (let i = 0; i < kbnOverviewAppsCards.length; i++) {
          const el = kbnOverviewAppsCards[i];
          const image = await el.findByCssSelector('img');
          const imageUrl = await image.getAttribute('src');
          found = imageUrl.includes(imgName);
          if (found) {
            break;
          }
        }
        expect(found).to.be(true);
      };

      for (let i = 0; i < apps.length; i++) {
        await verifyImageUrl(`kibana_${apps[i]}_light.svg`);
      }
    });

    it('click on a card should lead to the appropriate app', async () => {
      const kbnOverviewAppsCards = await find.allByCssSelector('.kbnOverviewApps__item');
      const dashboardCard = kbnOverviewAppsCards.at(0);
      expect(dashboardCard).not.to.be(undefined);
      if (dashboardCard) {
        await dashboardCard.click();
        await PageObjects.common.waitUntilUrlIncludes('app/dashboards');
      }
    });
  });
}
