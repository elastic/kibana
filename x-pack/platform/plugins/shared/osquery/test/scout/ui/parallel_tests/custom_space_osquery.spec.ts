/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Custom-space coverage is isolated from the default-space Fleet suite (`uiTest`).
 * Docker global setup enrolls Osquery Manager on default-space agent policies, so this space
 * typically shows the Osquery empty state until Fleet is extended for that space.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { customSpaceUiTest as test } from '../fixtures';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

const wiringTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery in a custom Kibana space', { tag: wiringTags }, () => {
  test('loads the Osquery app under the Scout space URL (installed app or add-integration empty state)', async ({
    browserAuth,
    page,
    scoutSpace,
  }) => {
    test.setTimeout(120_000);
    await browserAuth.loginAsAdmin();

    await page.gotoApp('osquery');
    await waitForKibanaChromeLoadingFinished(page).catch(() => {});

    await expect(page).toHaveURL(new RegExp(`/s/${scoutSpace.id}/app/osquery`));

    const addIntegration = page.testSubj.locator('osquery-add-integration-button');
    const installedShell = page.locator('#osquery-app');
    await expect(addIntegration.or(installedShell)).toBeVisible({ timeout: 120_000 });
  });
});
