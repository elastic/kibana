/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

// All Upgrade Assistant UI tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
//
// NOTE: When these are revisited, the component-render assertions below
// ("renders the overview page", "renders the overview upgrade steps") belong in
// an RTL component test rather than a Scout UI spec — Scout UI tests should
// exercise full user flows. A sibling RTL test already covers this surface at
// public/application/components/overview/overview.test.tsx and should be the
// home for pure render coverage. See
// https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#pick-the-right-test-type
test.describe.skip(
  'Upgrade Assistant overview page',
  { tag: testData.UPGRADE_ASSISTANT_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsSuperuser();
      await pageObjects.upgradeAssistant.gotoOverview();
    });

    test('renders the overview page', async ({ pageObjects }) => {
      await expect(pageObjects.upgradeAssistant.overview).toBeVisible();
    });

    test('renders the overview upgrade steps', async ({ pageObjects }) => {
      await expect(pageObjects.upgradeAssistant.backupStepIncomplete).toBeVisible();
      await expect(pageObjects.upgradeAssistant.migrateSystemIndicesText).toBeVisible();
      await expect(pageObjects.upgradeAssistant.fixIssuesStepIncomplete).toBeVisible();
      await expect(pageObjects.upgradeAssistant.logsStepIncomplete).toBeVisible();
      await expect(pageObjects.upgradeAssistant.upgradeStep).toBeVisible();
    });
  }
);
