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
import { CPS_INELIGIBLE_TIER_TAGS } from '../fixtures/roles';

const RUN_ID = randomUUID().slice(0, 8);

/**
 * On a CPS-ineligible tier (Security Essentials / Observability logs_essentials),
 * the Cross-project search section is hidden for create and for edit of spaces
 * with default routing, but remains visible when the space already has a custom
 * NPRE so downgraded users can unset it.
 *
 * Requires cps_local with `--domain security_essentials` or `observability_logs_essentials`.
 */
test.describe(
  'Spaces CPS project routing - ineligible tier',
  { tag: CPS_INELIGIBLE_TIER_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('hides the Cross-project search section on the create space page', async ({
      pageObjects,
    }) => {
      await pageObjects.spaces.gotoCreateSpace();
      await expect(pageObjects.spaces.createPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });

    test('hides the Cross-project search section on edit when space has default routing', async ({
      apiServices,
      pageObjects,
      createdSpaceIds,
    }) => {
      const spaceId = `cps-def-${RUN_ID}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: `${spaceId} space`,
        projectRouting: PROJECT_ROUTING.ALL,
      });
      createdSpaceIds.push(spaceId);

      await pageObjects.spaces.gotoEditSpace(spaceId);
      await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });

    test('hides the Cross-project search section on edit when project routing is unset', async ({
      apiServices,
      pageObjects,
      createdSpaceIds,
    }) => {
      const spaceId = `cps-unset-routing-${RUN_ID}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: `${spaceId} space`,
      });
      createdSpaceIds.push(spaceId);

      await pageObjects.spaces.gotoEditSpace(spaceId);
      await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
    });

    test('shows the Cross-project search section on edit when space has custom project routing', async ({
      apiServices,
      pageObjects,
      createdSpaceIds,
    }) => {
      const spaceId = `cps-custom-${RUN_ID}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: `${spaceId} space`,
        projectRouting: PROJECT_ROUTING.ORIGIN,
      });
      createdSpaceIds.push(spaceId);

      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.waitForProjectRoutingPicker();
      await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeVisible();
    });

    test('allows unsetting custom project routing on edit so the section can hide after save', async ({
      apiServices,
      pageObjects,
      createdSpaceIds,
    }) => {
      const spaceId = `cps-unset-${RUN_ID}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: `${spaceId} space`,
        projectRouting: PROJECT_ROUTING.ORIGIN,
      });
      createdSpaceIds.push(spaceId);

      await test.step('unset custom routing back to all projects and save', async () => {
        await pageObjects.spaces.gotoEditSpace(spaceId);
        await pageObjects.spaces.waitForProjectRoutingPicker();
        await expect(pageObjects.spaces.originProjectRoutingButtonLocator()).toHaveAttribute(
          'aria-pressed',
          'true'
        );

        await pageObjects.spaces.selectAllProjectsRouting();
        await pageObjects.spaces.saveSpace();
        await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();

        const space = await apiServices.spaces.get(spaceId);
        expect(space.projectRouting).toBe(PROJECT_ROUTING.ALL);
      });

      await test.step('reload edit page and confirm the section is now hidden', async () => {
        await pageObjects.spaces.gotoEditSpace(spaceId);
        await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
        await expect(pageObjects.spaces.cpsDefaultScopePanelLocator()).toBeHidden();
      });
    });
  }
);
