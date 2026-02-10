/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods, playwright/no-conditional-expect */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  loadPack,
  cleanupPack,
  getFirstPackagePolicyIds,
} from '../common/api_helpers';

test.describe('Packs - Create and Edit', { tag: ['@ess', '@svlSecurity'] }, () => {
  let savedQueryId: string;
  let savedQueryName: string;
  let nomappingSavedQueryId: string;
  let nomappingSavedQueryName: string;
  let oneMappingSavedQueryId: string;
  let oneMappingSavedQueryName: string;
  let multipleMappingsSavedQueryId: string;
  let multipleMappingsSavedQueryName: string;

  test.beforeAll(async ({ kbnClient }) => {
    // Load 4 saved queries with different ECS mappings
    const sq1 = await loadSavedQuery(kbnClient);
    savedQueryId = sq1.saved_object_id;
    savedQueryName = sq1.id;

    const sq2 = await loadSavedQuery(kbnClient, {
      ecs_mapping: {},
      interval: '3600',
      query: 'select * from uptime;',
    });
    nomappingSavedQueryId = sq2.saved_object_id;
    nomappingSavedQueryName = sq2.id;

    const sq3 = await loadSavedQuery(kbnClient, {
      ecs_mapping: {
        'client.geo.continent_name': {
          field: 'seconds',
        },
      },
      interval: '3600',
      query: 'select * from uptime;',
      timeout: 607,
    });
    oneMappingSavedQueryId = sq3.saved_object_id;
    oneMappingSavedQueryName = sq3.id;

    const sq4 = await loadSavedQuery(kbnClient, {
      ecs_mapping: {
        labels: {
          field: 'days',
        },
        tags: {
          field: 'seconds',
        },
        'client.address': {
          field: 'total_seconds',
        },
      },
      interval: '3600',
      query: 'select * from uptime;',
    });
    multipleMappingsSavedQueryId = sq4.saved_object_id;
    multipleMappingsSavedQueryName = sq4.id;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
    await pageObjects.packs.navigate();
  });

  test.afterAll(async ({ kbnClient }) => {
    await cleanupSavedQuery(kbnClient, savedQueryId);
    await cleanupSavedQuery(kbnClient, nomappingSavedQueryId);
    await cleanupSavedQuery(kbnClient, oneMappingSavedQueryId);
    await cleanupSavedQuery(kbnClient, multipleMappingsSavedQueryId);
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('Check if result type is correct', () => {
    let resultTypePackId: string;

    test.afterEach(async ({ kbnClient }) => {
      if (resultTypePackId) {
        await cleanupPack(kbnClient, resultTypePackId);
      }
    });

    test('Check if result type is correct', async ({ page, pageObjects, kbnClient }) => {
      const packName = `ResultType${Date.now()}`;
      const packs = pageObjects.packs;

      await packs.clickAddPack();
      await packs.fillPackName(packName);

      // Add Query1 with Snapshot (default)
      await packs.clickAddQuery();
      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.locator('input[name="id"]').fill('Query1');
      await page.testSubj.locator('kibanaCodeEditor').click();
      await page.testSubj.locator('kibanaCodeEditor').pressSequentially('select * from uptime;');
      await page.testSubj.locator('timeout-input').fill('601');
      await page.waitForTimeout(500); // Wait for validation
      await packs.clickSaveQueryInFlyout();

      // Add Query2 with Differential
      await packs.clickAddQuery();
      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.locator('input[name="id"]').fill('Query2');
      await page.testSubj.locator('kibanaCodeEditor').click();
      await page.testSubj.locator('kibanaCodeEditor').pressSequentially('select * from uptime;');
      await page.testSubj.locator('timeout-input').fill('602');
      await page.testSubj.locator('resultsTypeField').click();
      await page.getByText('Differential').first().click();
      await page.waitForTimeout(500); // Wait for validation
      await packs.clickSaveQueryInFlyout();

      // Add Query3 with Differential (Ignore removals)
      await packs.clickAddQuery();
      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.locator('input[name="id"]').fill('Query3');
      await page.testSubj.locator('kibanaCodeEditor').click();
      await page.testSubj.locator('kibanaCodeEditor').pressSequentially('select * from uptime;');
      await page.testSubj.locator('timeout-input').fill('603');
      await page.testSubj.locator('resultsTypeField').click();
      await page.getByText('Differential (Ignore removals)').first().click();
      await page.waitForTimeout(500); // Wait for validation
      await packs.clickSaveQueryInFlyout();

      await packs.clickSavePack();

      // Get pack ID from the response or URL
      await page.waitForTimeout(1000);
      const packUrl = page.url();
      const packIdMatch = packUrl.match(/\/packs\/([^/]+)/);
      if (packIdMatch) {
        resultTypePackId = packIdMatch[1];
      }

      // Navigate to pack details and edit
      await page.testSubj.locator('tablePaginationPopoverButton').click();
      await page.testSubj.locator('tablePagination-50-rows').click();
      await packs.clickPackByName(packName);
      await packs.clickEditPack();

      await expect(page.getByText('Query1')).toBeVisible();
      await expect(page.getByText('Query2')).toBeVisible();
      await expect(page.getByText('Query3')).toBeVisible();

      // Edit Query1 to Differential
      await page.locator(`[aria-label="Edit Query1"]`).click();
      await page.testSubj.locator('resultsTypeField').getByText('Snapshot').click();
      await page.getByText('Differential').first().click();
      await packs.clickSaveQueryInFlyout();

      // Edit Query2 to Differential (Ignore removals)
      await page.locator(`[aria-label="Edit Query2"]`).click();
      await page.testSubj.locator('resultsTypeField').getByText('Differential').click();
      await page.getByText('Differential (Ignore removals)').first().click();
      await packs.clickSaveQueryInFlyout();

      // Edit Query3 to Snapshot
      await page.locator(`[aria-label="Edit Query3"]`).click();
      await page.testSubj.locator('resultsTypeField').getByText('(Ignore removals)').click();
      await page.getByText('Snapshot').first().click();
      await packs.clickSaveQueryInFlyout();

      await packs.clickUpdatePack();
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('Check if pack is created', () => {
    let packId: string;
    let packName: string;

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should add a pack from a saved query', async ({ page, pageObjects, kbnClient }) => {
      packName = `Pack-name${Date.now()}`;
      const packs = pageObjects.packs;

      await packs.clickAddPack();
      await packs.fillPackName(packName);
      await packs.fillPackDescription('Pack description');

      // Get default policy
      await packs.clickAddQuery();
      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
      await packs.selectSavedQuery(savedQueryName);
      await page.testSubj.locator('osquery-interval-field').fill('5');
      await packs.clickSaveQueryInFlyout();

      await expect(page.locator('tbody > tr').filter({ hasText: savedQueryName })).toBeVisible();
      await packs.clickSavePack();

      // Extract pack ID from response
      await page.waitForTimeout(1000);
      const packUrl = page.url();
      const packIdMatch = packUrl.match(/\/packs\/([^/]+)/);
      if (packIdMatch) {
        packId = packIdMatch[1];
      }

      // Wait for the success toast notification before interacting with pagination
      await expect(page.getByText(`Successfully created "${packName}" pack`).first()).toBeVisible({
        timeout: 30_000,
      });

      const paginationButton = page.testSubj.locator('tablePaginationPopoverButton');
      if (await paginationButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await paginationButton.click();
        await page.testSubj
          .locator('tablePagination-50-rows')
          .waitFor({ state: 'visible', timeout: 5_000 });
        await page.testSubj.locator('tablePagination-50-rows').click();
      }

      await expect(page.getByText(packName).first()).toBeVisible();
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('to click the edit button and edit pack', () => {
    let packId: string;
    let packName: string;
    let newQueryName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
      newQueryName = `new-query-name${Date.now()}`;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should edit pack and add new query', async ({ page, pageObjects }) => {
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await packs.clickEditPack();

      await expect(page.getByText(`Edit ${packName}`).first()).toBeVisible();
      await packs.clickAddQuery();

      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.testSubj.locator('kibanaCodeEditor').click();
      await page.testSubj.locator('kibanaCodeEditor').pressSequentially('select * from uptime');
      await page.locator('input[name="id"]').fill(`${savedQueryName}`);

      await packs.clickSaveQueryInFlyout();
      await expect(page.getByText('ID must be unique').first()).toBeVisible();

      await page.locator('input[name="id"]').fill(newQueryName);
      await expect(page.getByText('ID must be unique').first()).not.toBeVisible();
      await page.waitForTimeout(500); // Wait for form validation to settle
      await packs.clickSaveQueryInFlyout();

      await expect(page.locator('tbody > tr').filter({ hasText: newQueryName })).toBeVisible({
        timeout: 15_000,
      });
      await packs.clickUpdatePack();
      await expect(page.getByText(`Successfully updated "${packName}" pack`).first()).toBeVisible({
        timeout: 30_000,
      });
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('should trigger validation when saved query is being chosen', () => {
    let packId: string;
    let packName: string;

    test.beforeAll(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterAll(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should trigger validation when saved query is being chosen', async ({
      page,
      pageObjects,
    }) => {
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await packs.clickEditPack();

      await packs.clickAddQuery();
      await expect(page.getByText('Attach next query').first()).toBeVisible();
      await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
      await expect(page.getByText('ID must be unique').first()).not.toBeVisible();

      await packs.selectSavedQuery(savedQueryName);
      await packs.clickSaveQueryInFlyout();
      await expect(page.getByText('ID must be unique').first()).toBeVisible();
      await packs.clickCancelQueryInFlyout();
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('should open lens in new tab', { tag: ['@ess'] }, () => {
    let packId: string;
    let packName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should open lens in new tab', { tag: ['@ess'] }, async ({ page, pageObjects }) => {
      test.setTimeout(300_000);

      // Stub window.open to capture the Lens URL
      let lensUrl = '';
      await page.exposeFunction('__capturedWindowOpen', (url: string) => {
        lensUrl = url;
      });
      await page.evaluate(() => {
        window.open = ((url: string) => {
          // @ts-expect-error exposed function
          window.__capturedWindowOpen(url);

          return null;
        }) as typeof window.open;
      });

      // Navigate to pack details
      await pageObjects.packs.clickPackByName(packName);
      await page.testSubj
        .locator('docsLoading')
        .waitFor({ state: 'visible' })
        .catch(() => {});
      await page.testSubj
        .locator('docsLoading')
        .waitFor({ state: 'hidden', timeout: 60_000 })
        .catch(() => {});

      // Click "View in Lens" button
      const viewInLensButton = page.locator('[aria-label="View in Lens"]').first();
      await viewInLensButton.waitFor({ state: 'visible', timeout: 30_000 });
      await viewInLensButton.click();

      // Visit the captured lens URL (may be relative, so resolve against current origin)
      if (lensUrl) {
        const absoluteLensUrl = lensUrl.startsWith('http')
          ? lensUrl
          : new URL(lensUrl, page.url()).href;
        await page.goto(absoluteLensUrl);
        await expect(page.testSubj.locator('lnsWorkspace')).toBeVisible({ timeout: 60_000 });
        await expect(page.testSubj.locator('breadcrumbs')).toContainText(
          `Action pack_${packName}_${savedQueryName}`
        );
      }
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe.skip('should open discover in new tab', { tag: ['@ess'] }, () => {
    let packId: string;
    let packName: string;

    test.beforeAll(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterAll(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should open discover in new tab', async ({ page, pageObjects, kbnUrl }) => {
      test.setTimeout(300_000);

      // Navigate to pack details
      await pageObjects.packs.clickPackByName(packName);
      await page.testSubj
        .locator('docsLoading')
        .waitFor({ state: 'visible' })
        .catch(() => {});
      await page.testSubj
        .locator('docsLoading')
        .waitFor({ state: 'hidden', timeout: 60_000 })
        .catch(() => {});

      // Find the Discover link for the saved query
      const discoverLink = page
        .locator(`[aria-label="Run ${savedQueryName}"]`)
        .first()
        .locator('a[href]');
      const href = await discoverLink.getAttribute('href');

      if (href) {
        const baseUrl = new URL(page.url()).origin;
        await page.goto(`${baseUrl}${href}`);

        await expect(page.testSubj.locator('breadcrumbs')).toContainText('Discover');
        await expect(
          page.getByText(`action_id: pack_${packName}_${savedQueryName}`).first()
        ).toBeVisible({ timeout: 30_000 });

        // Set date range to Today
        await page.testSubj.locator('superDatePickerToggleQuickMenuButton').click();
        await page.testSubj.locator('superDatePickerCommonlyUsed_Today').click();

        await expect(
          page.testSubj.locator('discoverDocTable').getByText(`pack_${packName}_${savedQueryName}`)
        ).toBeVisible({ timeout: 60_000 });
      }
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('deactivate and activate pack', () => {
    let packId: string;
    let packName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('deactivate and activate pack', async ({ pageObjects }) => {
      const packs = pageObjects.packs;
      await packs.changePackActiveStatus(packName);
      await packs.changePackActiveStatus(packName);
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('should verify that packs are triggered', () => {
    let packId: string;
    let packName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 60,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should verify that packs are triggered', async ({ page, pageObjects }) => {
      test.setTimeout(360_000); // Pack execution + 5-min result polling
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await expect(page.getByText(`${packName} details`).first()).toBeVisible();

      // Wait for pack results to appear
      let lastResultsDate = '-';
      const maxWait = Date.now() + 300_000; // 5 minutes

      while (lastResultsDate === '-' && Date.now() < maxWait) {
        await page.testSubj.locator('docsLoading').waitFor({ state: 'hidden' });
        const resultsCell = page.locator(
          'tbody .euiTableRow > td:nth-child(5) > .euiTableCellContent'
        );
        if ((await resultsCell.count()) > 0) {
          lastResultsDate = (await resultsCell.first().textContent()) || '-';
        }

        if (lastResultsDate === '-') {
          await page.reload();
          await page.waitForTimeout(5_000);
        }
      }

      await expect(page.testSubj.locator('last-results-date')).toBeVisible({ timeout: 30_000 });
      await expect(page.testSubj.locator('docs-count-badge')).toContainText('1', {
        timeout: 30_000,
      });
      await expect(page.testSubj.locator('agent-count-badge')).toContainText('1', {
        timeout: 30_000,
      });
      await expect(page.testSubj.locator('packResultsErrorsEmpty')).toHaveCount(1);
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('delete all queries in pack', () => {
    let packId: string;
    let packName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('delete all queries in pack', async ({ page, pageObjects }) => {
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await page
        .getByText(/^Edit$/)
        .first()
        .click();

      // Wait for the pack edit page to fully load
      await expect(page.getByText(`Edit ${packName}`).first()).toBeVisible({ timeout: 15_000 });
      await page.testSubj.locator('checkboxSelectAll').click();
      await page
        .getByText(/^Delete \d+ quer(y|ies)/)
        .first()
        .click();

      // Click update pack and handle confirmation modal
      await packs.clickUpdatePack();
      await expect(page.getByText(`Successfully updated "${packName}" pack`).first()).toBeVisible({
        timeout: 30_000,
      });

      // Navigate back to packs list and verify
      await pageObjects.packs.navigate();
      await packs.clickPackByName(packName);
      await expect(page.getByText(`${packName} details`).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/^No items found/).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('enable changing saved queries and ecs_mappings', () => {
    let packId: string;
    let packName: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('enable changing saved queries and ecs_mappings', async ({ page, pageObjects }) => {
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await page
        .getByText(/^Edit$/)
        .first()
        .click();

      await packs.clickAddQuery();
      await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
      await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();

      // Select saved query with multiple mappings
      await packs.selectSavedQuery(multipleMappingsSavedQueryName);
      await expect(page.getByText('Custom key/value pairs').first()).toBeVisible();
      await expect(page.getByText('Days of uptime').first()).toBeVisible();
      await expect(page.getByText('List of keywords used to tag each').first()).toBeVisible();
      await expect(page.getByText('Seconds of uptime').first()).toBeVisible();
      await expect(page.getByText('Client network address.').first()).toBeVisible();
      await expect(page.getByText('Total uptime seconds').first()).toBeVisible();
      await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(4);

      // Switch to saved query with no mappings
      await packs.selectSavedQuery(nomappingSavedQueryName);
      await expect(page.getByText('Custom key/value pairs').first()).not.toBeVisible();
      await expect(page.getByText('Days of uptime').first()).not.toBeVisible();
      await expect(page.getByText('List of keywords used to tag each').first()).not.toBeVisible();
      await expect(page.getByText('Seconds of uptime').first()).not.toBeVisible();
      await expect(page.getByText('Client network address.').first()).not.toBeVisible();
      await expect(page.getByText('Total uptime seconds').first()).not.toBeVisible();
      await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(1);

      // Switch to saved query with one mapping
      await packs.selectSavedQuery(oneMappingSavedQueryName);
      await expect(page.getByText('Name of the continent').first()).toBeVisible();
      await expect(page.getByText('Seconds of uptime').first()).toBeVisible();
      await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(2);

      await packs.clickSaveQueryInFlyout();
      await page.locator(`[aria-label="Edit ${oneMappingSavedQueryName}"]`).click();

      await expect(page.getByText('Name of the continent').first()).toBeVisible();
      await expect(page.getByText('Seconds of uptime').first()).toBeVisible();
      await expect(page.testSubj.locator('timeout-input')).toHaveValue('607');
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('to click delete button', () => {
    let packName: string;
    let packId: string;

    test.beforeEach(async ({ kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);

      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      packName = pack.name;
      packId = pack.saved_object_id;
    });

    test.afterEach(async ({ kbnClient }) => {
      if (packId) {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should delete pack', async ({ pageObjects }) => {
      const packs = pageObjects.packs;
      await packs.clickPackByName(packName);
      await packs.clickEditPack();
      await packs.deleteAndConfirm('pack');
    });
  });
});
