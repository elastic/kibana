/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { omit } from 'lodash';
import { test } from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  toggleInheritSwitch,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - ILM policy', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamChildren('logs');

    // Reset parent 'logs' stream to default indefinite retention (DSL with no data_retention)
    const logsDefinition = await apiServices.streams.getStreamDefinition('logs');
    await apiServices.streams.updateStream('logs', {
      ingest: {
        ...logsDefinition.stream.ingest,
        processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
        lifecycle: { dsl: {} },
      },
    });

    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
  });

  test('should show ILM policy button', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await expect(page.getByRole('button', { name: 'ILM policy' })).toBeVisible();
  });

  test('should select and save ILM policy', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Click ILM policy button
    await page.getByRole('button', { name: 'ILM policy' }).click();

    // Wait for the listbox to appear and select the first available policy
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();

    // Save changes
    await saveRetentionChanges(page);

    // Verify ILM policy is displayed in subtitle
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
  });

  test('should display selected ILM policy name', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Click ILM policy button and select policy
    await page.getByRole('button', { name: 'ILM policy' }).click();
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();

    // Save changes
    await saveRetentionChanges(page);

    // Verify the policy name is displayed using the badge test ID
    await expect(page.getByTestId('lifecycleBadge-logs.nginx')).toContainText('.alerts-ilm-policy');
  });

  test('should persist ILM policy selection across page reload', async ({ page, pageObjects }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Select ILM policy
    await page.getByRole('button', { name: 'ILM policy' }).click();
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();
    await saveRetentionChanges(page);

    // Reload page
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

    // Verify ILM policy persists
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
    await expect(page.getByTestId('lifecycleBadge-logs.nginx')).toContainText('.alerts-ilm-policy');
  });

  test('should open ILM lifecycle phase popup and display phase details', async ({ page }) => {
    // First set an ILM policy
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Click ILM policy button and select a policy
    await page.getByRole('button', { name: 'ILM policy' }).click();
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();
    await saveRetentionChanges(page);

    // Click on the hot phase button using test ID
    await page.getByTestId('lifecyclePhase-hot-button').click();

    // Verify the popover opens and shows the expected content
    await expect(page.getByTestId('lifecyclePhase-hot-popoverTitle')).toBeVisible();
    await expect(page.getByTestId('lifecyclePhase-hot-popoverContent')).toBeVisible();

    // Close the popover by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('should delete a downsampling step from an ILM policy', async ({
    page,
    esClient,
    apiServices,
  }) => {
    const policyName = 'downsampling-policy';

    await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
    await esClient.ilm.putLifecycle({
      name: policyName,
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: { max_age: '30d' },
            },
          },
          warm: {
            min_age: '1d',
            actions: {
              downsample: { fixed_interval: '1h' },
            },
          },
          delete: {
            min_age: '7d',
            actions: {
              delete: {},
            },
          },
        },
      },
    });

    try {
      const extraStreamName = 'logs.downsample';
      await apiServices.streams.forkStream('logs', extraStreamName, {
        field: 'service.name',
        eq: 'downsample',
      });
      const extraStreamDefinition = await apiServices.streams.getStreamDefinition(extraStreamName);
      await apiServices.streams.updateStream(extraStreamName, {
        ingest: {
          ...extraStreamDefinition.stream.ingest,
          processing: omit(extraStreamDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { ilm: { policy: policyName } },
        },
      });

      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);

      // Click ILM policy button and select the downsampling policy
      await page.getByRole('button', { name: 'ILM policy' }).click();
      const ilmListbox = page.getByRole('listbox', { name: 'Filter options' });
      await ilmListbox.waitFor();
      await page.getByPlaceholder('Filter options').fill(policyName);
      await page.getByTestId(`ilmPolicy-${policyName}`).click();
      await saveRetentionChanges(page);

      // Verify downsampling is rendered for the policy
      await expect(page.getByTestId('downsamplingBar-label')).toBeVisible();

      // Delete the downsampling step from the policy
      await page.getByTestId('downsamplingPhase-1h-label').click();
      await page.getByTestId('downsamplingPopover-step1-removeButton').click();

      await expect(page.getByTestId('editPolicyModalTitle')).toBeVisible();
      await page.getByTestId('editPolicyModal-overwriteButton').click();

      await expect(page.getByTestId('lifecyclePhase-warm-button')).toBeVisible();
      await expect(page.getByTestId('downsamplingBar-label')).toHaveCount(0);
    } finally {
      await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
    }
  });

  test('should create a new policy when deleting a downsampling step', async ({
    page,
    esClient,
    apiServices,
  }) => {
    const policyName = 'downsampling-policy';
    const newPolicyName = `${policyName}-copy`;

    await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
    await esClient.ilm.deleteLifecycle({ name: newPolicyName }).catch(() => {});
    await esClient.ilm.putLifecycle({
      name: policyName,
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: { max_age: '30d' },
            },
          },
          warm: {
            min_age: '1d',
            actions: {
              downsample: { fixed_interval: '1h' },
            },
          },
          delete: {
            min_age: '7d',
            actions: {
              delete: {},
            },
          },
        },
      },
    });

    try {
      const extraStreamName = 'logs.downsample-save-as-new';
      await apiServices.streams.forkStream('logs', extraStreamName, {
        field: 'service.name',
        eq: 'downsample-save-as-new',
      });
      const extraStreamDefinition = await apiServices.streams.getStreamDefinition(extraStreamName);
      await apiServices.streams.updateStream(extraStreamName, {
        ingest: {
          ...extraStreamDefinition.stream.ingest,
          processing: omit(extraStreamDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { ilm: { policy: policyName } },
        },
      });

      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);

      // Click ILM policy button and select the downsampling policy
      await page.getByRole('button', { name: 'ILM policy' }).click();
      const ilmListbox = page.getByRole('listbox', { name: 'Filter options' });
      await ilmListbox.waitFor();
      await page.getByPlaceholder('Filter options').fill(policyName);
      await page.getByTestId(`ilmPolicy-${policyName}`).click();
      await saveRetentionChanges(page);

      // Verify downsampling is rendered for the policy
      await expect(page.getByTestId('downsamplingBar-label')).toBeVisible();

      // Delete the downsampling step from the policy
      await page.getByTestId('downsamplingPhase-1h-label').click();
      await page.getByTestId('downsamplingPopover-step1-removeButton').click();

      await expect(page.getByTestId('editPolicyModalTitle')).toBeVisible();
      await page.getByTestId('editPolicyModal-saveAsNewButton').click();

      await expect(page.getByTestId('createPolicyModalTitle')).toBeVisible();
      await page.getByTestId('createPolicyModal-policyNameInput').fill(newPolicyName);
      await page.getByTestId('createPolicyModal-saveButton').click();

      await expect(page.getByTestId('lifecycleBadge-logs.nginx')).toContainText(newPolicyName);
      await expect(page.getByTestId('downsamplingBar-label')).toHaveCount(0);
    } finally {
      await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
      await esClient.ilm.deleteLifecycle({ name: newPolicyName }).catch(() => {});
    }
  });
});
