/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const NONDEFAULT_SPACE_ID = 'nondefaultspace';

// Full Kibana access, but scoped to a single non-default space. Validates that
// space-scoping hides Spaces management regardless of which space is scoped.
const NONDEFAULT_SPACE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: [NONDEFAULT_SPACE_ID] }],
};

test.describe(
  'Spaces feature controls: non-default space, role-specific privilege',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: NONDEFAULT_SPACE_ID, name: 'Non-default Space' });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(NONDEFAULT_SPACE_ROLE);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(NONDEFAULT_SPACE_ID);
    });

    test('can access Stack Management within its space', async ({ kbnUrl, page }) => {
      await page.goto(kbnUrl.app('management', { space: NONDEFAULT_SPACE_ID }));

      await expect(page.testSubj.locator('managementHome')).toBeVisible();
    });

    test('does not display Spaces in the management section', async ({ kbnUrl, page }) => {
      await page.goto(kbnUrl.app('management', { space: NONDEFAULT_SPACE_ID }));

      await expect(page.testSubj.locator('managementHome')).toBeVisible();
      await expect(page.testSubj.locator('spaces')).toBeHidden();
    });
  }
);
