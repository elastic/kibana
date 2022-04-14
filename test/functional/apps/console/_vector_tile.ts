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
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home']);
  const retry = getService('retry');

  describe('console vector tiles response validation', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('logs');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.dismissTutorial();
      await PageObjects.console.clearTextArea();
    });

    it('should validate response', async () => {
      await PageObjects.console.enterText(`GET kibana_sample_data_logs/_mvt/geo.coordinates/0/0/0`);
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        expect(actualResponse).to.contain('"meta": [');
      });
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('logs');
    });
  });
}
