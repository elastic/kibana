/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ensureDataView } from '../fixtures/data_views';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'change point chart attached from the ML app',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
      await ensureDataView(apiServices, 'ft_ecommerce', 'order_date', scoutSpace.id);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.unset('dateFormat:tz');
    });

    spaceTest(
      'attaches change point charts to a dashboard from the ML app',
      async ({ pageObjects }) => {
        await pageObjects.changePointChart.openFromMlApp();
        await pageObjects.changePointChart.selectAnalysisDataView('ft_ecommerce');
        await pageObjects.changePointChart.useFullData();
        await pageObjects.changePointChart.selectMetricField('products.discount_amount');
        await pageObjects.changePointChart.selectSplitField('geoip.city_name');
        await pageObjects.changePointChart.attachToNewDashboard();
        await expect(pageObjects.changePointChart.embeddable).toBeVisible();
      }
    );
  }
);
