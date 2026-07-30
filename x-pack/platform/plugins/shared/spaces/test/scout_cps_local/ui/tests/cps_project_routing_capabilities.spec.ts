/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { PROJECT_ROUTING } from '@kbn/cps-common';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import {
  CPS_ELIGIBLE_TIER_TAGS,
  SPACES_MANAGE_NO_PROJECT_ROUTING_ROLE,
  SPACES_MANAGE_PROJECT_ROUTING_READ_ROLE,
} from '../fixtures/roles';

const RUN_ID = randomUUID().slice(0, 8);

/**
 * Capability gating for the Cross-project search section on an eligible tier.
 * Run with cps_local + security_complete or observability_complete.
 */
test.describe('Spaces CPS project routing - capabilities', { tag: CPS_ELIGIBLE_TIER_TAGS }, () => {
  test('hides the section when the user lacks project_routing privileges', async ({
    browserAuth,
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const spaceId = `cps-nocap-${RUN_ID}`;
    await apiServices.spaces.create({
      id: spaceId,
      name: `${spaceId} space`,
      projectRouting: PROJECT_ROUTING.ORIGIN,
    });
    createdSpaceIds.push(spaceId);

    await browserAuth.loginWithCustomRole(SPACES_MANAGE_NO_PROJECT_ROUTING_ROLE);

    await test.step('create page hides the section', async () => {
      await pageObjects.spaces.gotoCreateSpace();
      await expect(pageObjects.spaces.createPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });

    await test.step('edit page hides the section even with custom routing', async () => {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });
  });

  test('shows a read-only picker when the user can read but not manage project routing', async ({
    browserAuth,
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const spaceId = `cps-readonly-${RUN_ID}`;
    await apiServices.spaces.create({
      id: spaceId,
      name: `${spaceId} space`,
      projectRouting: PROJECT_ROUTING.ORIGIN,
    });
    createdSpaceIds.push(spaceId);

    await browserAuth.loginWithCustomRole(SPACES_MANAGE_PROJECT_ROUTING_READ_ROLE);

    await test.step('create page hides the section without manage privilege', async () => {
      await pageObjects.spaces.gotoCreateSpace();
      await expect(pageObjects.spaces.createPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });

    await test.step('edit page shows the section with a disabled picker', async () => {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.waitForProjectRoutingPicker();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeVisible();
      await expect(pageObjects.spaces.allProjectsRoutingButtonLocator()).toBeDisabled();
      await expect(pageObjects.spaces.originProjectRoutingButtonLocator()).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
  });
});
