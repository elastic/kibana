/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, loadTestFile, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'settings']);

  describe('a11y tests', function () {
    describe('using flights sample data', function () {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.home.addSampleDataSet('flights');
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.home.removeSampleDataSet('flights');
        await kibanaServer.savedObjects.clean({
          types: ['search', 'index-pattern', 'visualization', 'dashboard'],
        });
      });

      loadTestFile(require.resolve('./dashboard'));
      loadTestFile(require.resolve('./filter_panel'));
      loadTestFile(require.resolve('./home'));
      loadTestFile(require.resolve('./discover'));
      loadTestFile(require.resolve('./visualize'));
      loadTestFile(require.resolve('./kibana_overview_with_data'));
    });

    describe('not using sample data', function () {
      loadTestFile(require.resolve('./management'));
      loadTestFile(require.resolve('./console'));
      loadTestFile(require.resolve('./kibana_overview_without_data'));
    });
  });
}
