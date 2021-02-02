/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');

  describe('Kibana Home', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('home');
    });

    it('Kibana Home view', async () => {
      await a11y.testAppSnapshot();
    });

    it('Add Kibana sample data page', async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await a11y.testAppSnapshot();
    });

    it('Add flights sample data set', async () => {
      await PageObjects.home.addSampleDataSet('flights');
      await a11y.testAppSnapshot();
    });
  });
}
