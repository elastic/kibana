/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FTR source: x-pack/platform/test/accessibility/apps/group1/index_lifecycle_management.ts

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// The fs snapshot repository needs `path.repo`, which Elastic Cloud deployments don't expose.
const LOCAL_ONLY_TAGS = ['@local-stateful-classic'];

const REPO_NAME = 'scout-ilm-a11y-repo';
// Must sit under one of the `path.repo` entries of the Scout stateful cluster.
const REPO_LOCATION = '/tmp/repo';
const POLICY_NAME = 'scout-ilm-a11y-policy';
const NEW_POLICY_NAME = 'scout-ilm-a11y-new-policy';
const TEMPLATE_NAME = 'scout-ilm-a11y-template';

// Modals and flyouts render in an EUI portal outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Index Lifecycle Policies — forms and actions', { tag: LOCAL_ONLY_TAGS }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.snapshot.createRepository({
      name: REPO_NAME,
      verify: false,
      repository: { type: 'fs', settings: { location: REPO_LOCATION } },
    });
    await esClient.ilm.putLifecycle({
      name: POLICY_NAME,
      policy: {
        phases: {
          hot: { actions: {} },
          warm: { actions: {} },
          cold: { actions: {} },
          frozen: { actions: { searchable_snapshot: { snapshot_repository: REPO_NAME } } },
          delete: { actions: {} },
        },
      },
    });
    await esClient.indices.putIndexTemplate({
      name: TEMPLATE_NAME,
      index_patterns: ['scout-ilm-a11y-*'],
      template: { settings: { lifecycle: { name: POLICY_NAME } } },
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // The repository and index template routes run as the current user, so this needs more than manage_ilm.
    await browserAuth.loginAsAdmin();
    await pageObjects.ilm.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.deleteIndexTemplate({ name: TEMPLATE_NAME }, { ignore: [404] });
    await esClient.ilm.deleteLifecycle({ name: POLICY_NAME }, { ignore: [404] });
    await esClient.snapshot.deleteRepository({ name: REPO_NAME }, { ignore: [404] });
  });

  test('edit form, request flyout and create form have no a11y violations', async ({
    page,
    pageObjects,
  }) => {
    const { ilm } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('policies list', async () => {
      await ilm.filterPolicies(POLICY_NAME);
      await expect(ilm.getPolicyRow(POLICY_NAME)).toBeVisible();
      await expectNoA11yViolations();
    });

    await test.step('edit form', async () => {
      await ilm.gotoEditPolicy(POLICY_NAME);
      await expect(ilm.pageHeader).toHaveText(`Edit policy ${POLICY_NAME}`);
      await expectNoA11yViolations();
    });

    await test.step('request flyout', async () => {
      await ilm.requestButton.click();
      await expect(ilm.requestFlyout).toBeVisible();
      await expectNoA11yViolations();
    });

    // Last on purpose: leaving a dirty create form would trigger the unsaved-changes prompt.
    await test.step('create form with all phases enabled', async () => {
      await ilm.goto();
      await ilm.createPolicyButton.click();
      await expect(ilm.pageHeader).toHaveText('Create policy');
      await ilm.fillPolicyForm({
        policyName: NEW_POLICY_NAME,
        warmEnabled: true,
        coldEnabled: true,
        frozenEnabled: true,
        deleteEnabled: true,
        snapshotRepository: REPO_NAME,
      });
      await expectNoA11yViolations();
    });
  });

  test('policy flyout, modals and index templates flyout have no a11y violations', async ({
    page,
    pageObjects,
  }) => {
    const { ilm } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('filter the list down to the seeded policy', async () => {
      await ilm.filterPolicies(POLICY_NAME);
      await expect(ilm.getPolicyRow(POLICY_NAME)).toBeVisible();
    });

    await test.step('view policy flyout', async () => {
      await ilm.clickPolicyLink(POLICY_NAME);
      await expect(ilm.policyFlyoutTitle).toHaveText(POLICY_NAME);
      await expectNoA11yViolations();
      await ilm.policyFlyoutCloseButton.click();
    });

    await test.step('add policy to index template modal', async () => {
      await ilm.openPolicyActionsMenu(POLICY_NAME);
      await ilm.addToTemplateAction.click();
      await expect(ilm.addToTemplateModal).toBeVisible();
      await expectNoA11yViolations();
      await page.keyboard.press('Escape');
      await expect(ilm.addToTemplateModal).toBeHidden();
    });

    await test.step('delete policy modal', async () => {
      await ilm.getPolicyRow(POLICY_NAME).getByTestId('deletePolicy').click();
      await expect(ilm.deletePolicyModal).toBeVisible();
      await expectNoA11yViolations();
      await page.keyboard.press('Escape');
      await expect(ilm.deletePolicyModal).toBeHidden();
    });

    await test.step('index templates flyout', async () => {
      await ilm.getPolicyRow(POLICY_NAME).getByTestId('viewIndexTemplates').click();
      await expect(ilm.indexTemplatesFlyoutHeader).toBeVisible();
      await expectNoA11yViolations();
    });
  });
});
