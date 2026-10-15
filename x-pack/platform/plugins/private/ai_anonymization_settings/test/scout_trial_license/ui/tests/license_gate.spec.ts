/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const PATTERN_TESTER_ROUTE = '/internal/ai_anonymization_settings/pattern_tester';

// Serial: the first test needs the trial license that the last one destroys.
test.describe.serial(
  'Anonymization Settings - Enterprise license gate',
  { tag: '@local-stateful-classic' },
  () => {
    test('is available on the trial license, which includes Enterprise features', async ({
      browserAuth,
      pageObjects,
      config,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.anonymizationSettings.navigateTo();
      await expect(pageObjects.anonymizationSettings.getPageTitle()).toBeVisible();

      const response = await callPatternTester(config);
      expect(response.status).toBe(200);
    });

    // THIS TEST MUST BE LAST. IT IS DESTRUCTIVE! IT REMOVES THE TRIAL LICENSE!
    test('hides the page and refuses the pattern tester once the license drops to basic', async ({
      esClient,
      page,
      config,
    }) => {
      await esClient.license.postStartBasic({ acknowledge: true });
      await expect
        .poll(async () => (await esClient.license.get()).license.type, { timeout: 30_000 })
        .toBe('basic');

      // Kibana's licensing plugin polls Elasticsearch, so it learns about the change a bit later.
      await expect
        .poll(async () => (await callPatternTester(config)).status, {
          timeout: 120_000,
          intervals: [2_000],
        })
        .toBe(403);

      // A basic license makes the SAML realm non-compliant, so `browserAuth` can no longer sign in.
      // Basic authentication stays available, so the browser authenticates with a header instead.
      await page.context().setExtraHTTPHeaders({ Authorization: basicAuthHeader(config) });
      await page.gotoApp('management/ai/aiAnonymizationSettings');

      // With the app disabled, Management falls through to its landing page. Waiting for it proves the
      // browser is signed in and the router has resolved, so a hidden page is not just one that has
      // not mounted yet.
      await page.testSubj.waitForSelector('cards-navigation-page', { state: 'visible' });
      await expect(page.testSubj.locator('aiAnonymizationSettingsPage')).toBeHidden();
    });
  }
);

interface Config {
  auth: { username: string; password: string };
  hosts: { kibana: string };
}

const basicAuthHeader = ({ auth: { username, password } }: Config) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const callPatternTester = async (config: Config) => {
  const response = await fetch(`${config.hosts.kibana}${PATTERN_TESTER_ROUTE}`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(config),
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    },
    body: JSON.stringify({ input: { contact: 'a.mehta@example.com' }, rules: [] }),
  });
  return { status: response.status };
};
