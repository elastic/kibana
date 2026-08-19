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
import { CPS_ELIGIBLE_TIER_TAGS } from '../fixtures/roles';

const RUN_ID = randomUUID().slice(0, 8);

/**
 * On a CPS-eligible tier (Security/Observability Complete), the Cross-project
 * search section is visible and project routing can be created/updated via the
 * spaces UI.
 *
 * Requires cps_local with `--domain security_complete` or `observability_complete`.
 */
test.describe('Spaces CPS project routing - eligible tier', { tag: CPS_ELIGIBLE_TIER_TAGS }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('shows the Cross-project search section on the create space page', async ({
    pageObjects,
  }) => {
    await pageObjects.spaces.gotoCreateSpace();
    await pageObjects.spaces.waitForProjectRoutingPicker();
    await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeVisible();
  });

  test('shows the Cross-project search section on the edit space page', async ({
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const spaceId = `cps-elig-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });
    createdSpaceIds.push(spaceId);

    await pageObjects.spaces.gotoEditSpace(spaceId);
    await pageObjects.spaces.waitForProjectRoutingPicker();
    await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeVisible();
  });

  test('creates a space with default all-projects routing and persists it', async ({
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const token = `cpsall${RUN_ID}`;
    const spaceName = `${token} space`;
    const spaceId = spaceName.replaceAll(' ', '-');
    createdSpaceIds.push(spaceId);

    await pageObjects.spaces.gotoCreateSpace();
    await pageObjects.spaces.setSpaceName(spaceName);
    await pageObjects.spaces.waitForProjectRoutingPicker();
    await expect(pageObjects.spaces.allProjectsRoutingButtonLocator()).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await pageObjects.spaces.saveSpace();

    await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

    const space = await apiServices.spaces.get(spaceId);
    expect(space.projectRouting).toBe(PROJECT_ROUTING.ALL);
  });

  test('creates a space with origin-only project routing and persists it', async ({
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const token = `cpscreate${RUN_ID}`;
    const spaceName = `${token} space`;
    const spaceId = spaceName.replace(' ', '-');
    createdSpaceIds.push(spaceId);

    await pageObjects.spaces.gotoCreateSpace();
    await pageObjects.spaces.setSpaceName(spaceName);
    await pageObjects.spaces.waitForProjectRoutingPicker();
    await pageObjects.spaces.selectOriginProjectRouting();
    await pageObjects.spaces.saveSpace();

    await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

    const space = await apiServices.spaces.get(spaceId);
    expect(space.projectRouting).toBe(PROJECT_ROUTING.ORIGIN);
  });

  test('updates project routing on edit and persists after reload', async ({
    apiServices,
    pageObjects,
    createdSpaceIds,
  }) => {
    const spaceId = `cps-edit-${RUN_ID}`;
    await apiServices.spaces.create({
      id: spaceId,
      name: `${spaceId} space`,
      projectRouting: PROJECT_ROUTING.ALL,
    });
    createdSpaceIds.push(spaceId);

    await test.step('set origin-only routing and save', async () => {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.waitForProjectRoutingPicker();
      await pageObjects.spaces.selectOriginProjectRouting();
      await pageObjects.spaces.saveSpace();
      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

      const space = await apiServices.spaces.get(spaceId);
      expect(space.projectRouting).toBe(PROJECT_ROUTING.ORIGIN);
    });

    await test.step('reload edit page and confirm origin-only is selected', async () => {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.waitForProjectRoutingPicker();
      await expect(pageObjects.spaces.originProjectRoutingButtonLocator()).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    await test.step('reset to all-projects routing and save', async () => {
      await pageObjects.spaces.selectAllProjectsRouting();
      await pageObjects.spaces.saveSpace();
      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

      const space = await apiServices.spaces.get(spaceId);
      expect(space.projectRouting).toBe(PROJECT_ROUTING.ALL);
    });
  });

  test('updates the chrome project picker when the active space routing is saved', async ({
    apiServices,
    pageObjects,
    page,
    kbnUrl,
    createdSpaceIds,
  }) => {
    const spaceId = `cps-active-${RUN_ID}`;
    await apiServices.spaces.create({
      id: spaceId,
      name: `${spaceId} space`,
      projectRouting: PROJECT_ROUTING.ALL,
    });
    createdSpaceIds.push(spaceId);

    // Discover registers CPS picker access as EDITABLE; Security home leaves it
    // DISABLED (disabled chrome button), so assert against Discover.
    await page.goto(kbnUrl.app('discover', { space: spaceId }));
    await expect(pageObjects.spaces.cpsProjectPickerButtonLocator()).toBeVisible();
    await expect(pageObjects.spaces.cpsProjectPickerButtonLocator()).toHaveText('All');

    await page.goto(kbnUrl.app(`management/kibana/spaces/edit/${spaceId}`, { space: spaceId }));
    await pageObjects.spaces.waitForProjectRoutingPicker();
    await pageObjects.spaces.selectOriginProjectRouting();
    await pageObjects.spaces.saveSpace();
    await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

    await page.goto(kbnUrl.app('discover', { space: spaceId }));
    // Origin-only scope shows "1/N" instead of "All" in the chrome picker.
    await expect(pageObjects.spaces.cpsProjectPickerButtonLocator()).toBeVisible();
    await expect(pageObjects.spaces.cpsProjectPickerButtonLocator()).not.toHaveText('All');
    await expect(pageObjects.spaces.cpsProjectPickerButtonLocator()).toHaveText(/\d+\/\d+/);
  });
});
