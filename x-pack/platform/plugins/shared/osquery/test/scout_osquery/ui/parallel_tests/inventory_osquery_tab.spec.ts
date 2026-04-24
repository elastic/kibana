/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Infra host asset Osquery tab (embedded OsqueryAction) — owned in osquery Scout UI. */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

const statefulLocalOnly = tags.stateful.classic;

test.describe('Inventory host Osquery tab', { tag: statefulLocalOnly }, () => {
  test('submits a simple query from the embedded Osquery form', async ({
    browserAuth,
    page,
    pageObjects,
    kbnClient,
  }) => {
    // 5 min: Infra host page + embedded osquery submit.
    test.setTimeout(300_000);
    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsOsqueryPowerUser();

    const hostname = 'scout-osquery-agent-0';
    await pageObjects.osqueryInventoryHostOsquery.gotoHostOsqueryTab('default', hostname);
    await pageObjects.osqueryInventoryHostOsquery.submitSimpleEmbeddedQuery(
      'select * from uptime limit 1;'
    );

    await expect(page.testSubj.locator('osqueryResultsTable')).toBeVisible({ timeout: 180_000 });
  });
});
