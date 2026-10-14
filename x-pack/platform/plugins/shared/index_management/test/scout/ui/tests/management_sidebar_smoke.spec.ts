/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

/**
 * Bridge smoke test: proves the API capabilities → React context → DOM wiring is intact
 * for the Stack Management sidebar.
 *
 * The API specs (parallel_tests/management_capabilities/) verify that the capabilities
 * response payload is correct for a given role. The Jest/RTL tests in the management
 * plugin verify that the sidebar renders correctly given a capabilities prop. This spec
 * is the glue: it fires a real browser, logs in with the index_management_user role, and
 * asserts that the sidebar DOM matches what the capabilities API promises.
 *
 * One representative role, one smoke assertion — not a full role matrix.
 *
 * FTR source: x-pack/platform/test/functional/apps/index_management/feature_controls/index_management_security.ts
 * → describe('global dashboard read with index_management_user') → describe('"Data" section with index management')
 */
test.describe('Index Management — management sidebar smoke', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagementCapabilityCheck);
  });

  test('data section contains index_management and transform for index_management_user role', async ({
    page,
    pageObjects,
  }) => {
    await page.gotoApp('management');

    // Wait for the sidebar to be present before reading sections.
    await expect(page.locator('.kbnSolutionNav')).toBeVisible();

    const sections = await pageObjects.indexManagement.readSidebarSections();

    const dataSection = sections.find((s) => s.sectionId === 'data');
    expect(dataSection).toBeDefined();
    expect(dataSection?.sectionLinks).toContain('index_management');
    expect(dataSection?.sectionLinks).toContain('transform');
  });
});
