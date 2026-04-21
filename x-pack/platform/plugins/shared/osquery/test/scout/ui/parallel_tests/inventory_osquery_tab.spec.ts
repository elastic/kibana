/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * OpenSpec decision 14: Infra → Host → Osquery tab positive path lives in the osquery plugin
 * (component-under-test is OsqueryAction), not Infra’s Scout suite.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';

const statefulLocalOnly = ['@local-stateful-classic'];

test.describe('Inventory host Osquery tab', { tag: statefulLocalOnly }, () => {
  test('submits a simple query from the embedded Osquery form', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    const hostname = 'scout-osquery-agent-0';
    await pageObjects.osqueryInventoryHostOsquery.gotoHostOsqueryTab('default', hostname);
    await pageObjects.osqueryInventoryHostOsquery.submitSimpleEmbeddedQuery(
      'select * from uptime limit 1;'
    );

    await expect(page.testSubj.locator('osqueryResultsTable')).toBeVisible({ timeout: 180_000 });
  });
});
