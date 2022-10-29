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
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visChart',
    'header',
    'timePicker',
    'discover',
  ]);

  describe('adhoc data views', function indexPatternCreation() {
    before(async () => {
      await PageObjects.visualize.initTests();
    });

    before(async function () {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);

      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await security.testUser.restoreDefaults();
    });

    it('should open saved search correctly using adhoc data views', async () => {
      await PageObjects.discover.createAdHocDataView('logstash', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.saveSearch('logstash*-adhoc');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickAreaChart();

      await PageObjects.visualize.clickSavedSearch('logstash*-adhoc');
      await PageObjects.visChart.waitForVisualization();

      const button = await testSubjects.find('visualize-data-view-switch-link');
      const dataViewTitle = await button.getAttribute('title');

      expect(dataViewTitle).to.be('logstash*');
    });
  });
}
