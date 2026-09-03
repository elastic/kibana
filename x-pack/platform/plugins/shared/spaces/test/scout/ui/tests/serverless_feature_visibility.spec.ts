/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Serverless projects run with `xpack.spaces.allowFeatureVisibility: false`, so
// the space forms must not offer feature-visibility controls. Stateful ships the
// opposite behaviour, covered by `create_edit_space.spec.ts`.
//
// FTR source: x-pack/platform/test/serverless/functional/test_suites/spaces/spaces_management.ts
//             -> describe('as Admin') -> it('does not display feature visibility')
//
// The two sibling FTR tests in that file (spaces management card hidden from
// Viewer / shown to Admin) were not migrated: they are already covered, and the
// Admin one as a strict superset, by
// x-pack/platform/test/serverless/functional/test_suites/platform_security/navigation/management_nav_cards.ts
// which runs from the same serverless configs.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

test.describe(
  'Spaces feature visibility in serverless',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('does not offer feature visibility when creating a space', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.spaces.gotoCreateSpace();

      // Anchor on a control that is always present so the count-0 assertion below
      // proves the feature-visibility link is absent, not that the form is still
      // loading. The create-space form is the case that pins the offering default.
      await expect(page.testSubj.locator('addSpaceName')).toBeVisible();
      await expect(pageObjects.spaces.hideAllFeaturesLinkLocator()).toHaveCount(0);
    });

    test('does not offer feature visibility when editing a space', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.spaces.gotoEditSpace('default');

      await expect(page.testSubj.locator('addSpaceName')).toBeVisible();
      await expect(pageObjects.spaces.hideAllFeaturesLinkLocator()).toHaveCount(0);
    });
  }
);
