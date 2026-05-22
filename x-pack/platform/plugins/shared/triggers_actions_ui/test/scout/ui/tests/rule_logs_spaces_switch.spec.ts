/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SPACE_2 = {
  id: 'space-2',
  name: 'Space 2',
  disabledFeatures: [],
};

const RULES_APP_NAME = 'rules';
const LOGS_TAB_SUBJ = 'logsTab';
const ALL_SPACES_SWITCH_SUBJ = 'showAllSpacesSwitch';

test.describe('Rule logs "show all spaces" switch', { tag: tags.stateful.classic }, () => {
  test.afterEach(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_2.id);
  });

  test('hides the switch when only the default space exists', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp(RULES_APP_NAME);
    await page.testSubj.click(LOGS_TAB_SUBJ);

    await expect(page.testSubj.locator(ALL_SPACES_SWITCH_SUBJ)).toBeHidden();
  });

  test('shows the switch and toggles it when multiple spaces are accessible', async ({
    apiServices,
    browserAuth,
    page,
  }) => {
    await apiServices.spaces.create(SPACE_2);
    await browserAuth.loginAsAdmin();
    await page.gotoApp(RULES_APP_NAME);
    await page.testSubj.click(LOGS_TAB_SUBJ);

    const spacesSwitch = page.testSubj.locator(ALL_SPACES_SWITCH_SUBJ);
    await expect(spacesSwitch).toBeVisible();

    // EuiSwitch renders <button role="switch" aria-checked="...">.
    const switchButton = spacesSwitch.getByRole('switch');
    await expect(switchButton).toHaveAttribute('aria-checked', 'false');
    await switchButton.click();
    await expect(switchButton).toHaveAttribute('aria-checked', 'true');
  });

  test('hides the switch when the user can only access one space', async ({
    apiServices,
    browserAuth,
    kbnUrl,
    page,
  }) => {
    await apiServices.spaces.create(SPACE_2);

    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['*'], privileges: ['all'] }],
      },
      kibana: [
        {
          base: ['all'],
          feature: {},
          spaces: [SPACE_2.id],
        },
      ],
    });
    await page.goto(kbnUrl.app(RULES_APP_NAME, { space: SPACE_2.id }));
    await page.testSubj.click(LOGS_TAB_SUBJ);

    await expect(page.testSubj.locator(ALL_SPACES_SWITCH_SUBJ)).toBeHidden();
  });
});
