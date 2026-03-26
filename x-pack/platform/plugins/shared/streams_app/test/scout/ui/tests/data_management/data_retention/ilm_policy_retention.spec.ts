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
    await apiServices.streams.clearStreamChildren('logs.otel');

    // Reset parent 'logs.otel' stream to default indefinite retention (DSL with no data_retention)
    const logsDefinition = await apiServices.streams.getStreamDefinition('logs.otel');
    await apiServices.streams.updateStream('logs.otel', {
      ingest: {
        ...logsDefinition.stream.ingest,
        processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
        lifecycle: { dsl: {} },
      },
    });

    await apiServices.streams.forkStream('logs.otel', 'logs.otel.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.otel.nginx');
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await apiServices.streams.clearStreamChildren('logs.otel');
  });

  test.afterAll(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs.otel');
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
    await expect(page.getByTestId('lifecycleBadge-logs.otel.nginx')).toContainText(
      '.alerts-ilm-policy'
    );
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
    await pageObjects.streams.gotoDataRetentionTab('logs.otel.nginx');

    // Verify ILM policy persists
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
    await expect(page.getByTestId('lifecycleBadge-logs.otel.nginx')).toContainText(
      '.alerts-ilm-policy'
    );
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
    pageObjects,
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
      // Downsampling UI is only available for TSDB (time_series) streams.
      const tsdbStreamName = 'streams-ilm-policy-tsdb-delete-step';
      const extraStreamName = `${tsdbStreamName}-other`;
      const templateName = `${tsdbStreamName}-template`;

      await esClient.indices.putIndexTemplate({
        name: templateName,
        index_patterns: [`${tsdbStreamName}*`],
        priority: 2000,
        data_stream: {},
        template: {
          settings: { 'index.mode': 'time_series' },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              'host.name': { type: 'keyword', time_series_dimension: true },
              'service.name': { type: 'keyword', time_series_dimension: true },
              cpu_usage: { type: 'float', time_series_metric: 'gauge' },
              memory_usage: { type: 'float', time_series_metric: 'gauge' },
            },
          },
        },
      });

      await esClient.indices.deleteDataStream({ name: tsdbStreamName }).catch(() => {});
      await esClient.indices.deleteDataStream({ name: extraStreamName }).catch(() => {});

      const now = new Date().toISOString();
      const operations = [
        { create: {} },
        {
          '@timestamp': now,
          'host.name': 'host-1',
          'service.name': 'service-1',
          cpu_usage: 1,
          memory_usage: 1,
        },
      ];

      await esClient.bulk({ index: tsdbStreamName, operations, refresh: true });
      await esClient.bulk({ index: extraStreamName, operations, refresh: true });
      await esClient.indices.putDataStreamSettings({
        name: extraStreamName,
        settings: { 'index.lifecycle.name': policyName, 'index.lifecycle.prefer_ilm': true },
      });

      await pageObjects.streams.gotoDataRetentionTab(tsdbStreamName);

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
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-delete-step' })
        .catch(() => {});
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-delete-step-other' })
        .catch(() => {});
      await esClient.indices
        .deleteIndexTemplate({ name: 'streams-ilm-policy-tsdb-delete-step-template' })
        .catch(() => {});
    }
  });

  test('should create a new policy when deleting a downsampling step', async ({
    page,
    esClient,
    pageObjects,
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
      // Downsampling UI is only available for TSDB (time_series) streams.
      const tsdbStreamName = 'streams-ilm-policy-tsdb-save-as-new';
      const extraStreamName = `${tsdbStreamName}-other`;
      const templateName = `${tsdbStreamName}-template`;

      await esClient.indices.putIndexTemplate({
        name: templateName,
        index_patterns: [`${tsdbStreamName}*`],
        priority: 2000,
        data_stream: {},
        template: {
          settings: { 'index.mode': 'time_series' },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              'host.name': { type: 'keyword', time_series_dimension: true },
              'service.name': { type: 'keyword', time_series_dimension: true },
              cpu_usage: { type: 'float', time_series_metric: 'gauge' },
              memory_usage: { type: 'float', time_series_metric: 'gauge' },
            },
          },
        },
      });

      await esClient.indices.deleteDataStream({ name: tsdbStreamName }).catch(() => {});
      await esClient.indices.deleteDataStream({ name: extraStreamName }).catch(() => {});

      const now = new Date().toISOString();
      const operations = [
        { create: {} },
        {
          '@timestamp': now,
          'host.name': 'host-1',
          'service.name': 'service-1',
          cpu_usage: 1,
          memory_usage: 1,
        },
      ];

      await esClient.bulk({ index: tsdbStreamName, operations, refresh: true });
      await esClient.bulk({ index: extraStreamName, operations, refresh: true });
      await esClient.indices.putDataStreamSettings({
        name: extraStreamName,
        settings: { 'index.lifecycle.name': policyName, 'index.lifecycle.prefer_ilm': true },
      });

      await pageObjects.streams.gotoDataRetentionTab(tsdbStreamName);

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

      await expect(page.getByTestId(`lifecycleBadge-${tsdbStreamName}`)).toContainText(
        newPolicyName
      );
      await expect(page.getByTestId('downsamplingBar-label')).toHaveCount(0);
    } finally {
      await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
      await esClient.ilm.deleteLifecycle({ name: newPolicyName }).catch(() => {});
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-save-as-new' })
        .catch(() => {});
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-save-as-new-other' })
        .catch(() => {});
      await esClient.indices
        .deleteIndexTemplate({ name: 'streams-ilm-policy-tsdb-save-as-new-template' })
        .catch(() => {});
    }
  });

  test('should edit a policy phase, add downsampling, and save', async ({
    page,
    esClient,
    pageObjects,
  }) => {
    const policyName = 'downsampling-policy-edit';

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
            actions: {},
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
      // Ensure the policy is also used by another stream so saving edits requires confirmation.
      // Downsampling UI is only available for TSDB (time_series) streams.
      const tsdbStreamName = 'streams-ilm-policy-tsdb-edit-phase';
      const extraStreamName = `${tsdbStreamName}-other`;
      const templateName = `${tsdbStreamName}-template`;

      await esClient.indices.putIndexTemplate({
        name: templateName,
        index_patterns: [`${tsdbStreamName}*`],
        priority: 2000,
        data_stream: {},
        template: {
          settings: { 'index.mode': 'time_series' },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              'host.name': { type: 'keyword', time_series_dimension: true },
              'service.name': { type: 'keyword', time_series_dimension: true },
              cpu_usage: { type: 'float', time_series_metric: 'gauge' },
              memory_usage: { type: 'float', time_series_metric: 'gauge' },
            },
          },
        },
      });

      await esClient.indices.deleteDataStream({ name: tsdbStreamName }).catch(() => {});
      await esClient.indices.deleteDataStream({ name: extraStreamName }).catch(() => {});

      const now = new Date().toISOString();
      const operations = [
        { create: {} },
        {
          '@timestamp': now,
          'host.name': 'host-1',
          'service.name': 'service-1',
          cpu_usage: 1,
          memory_usage: 1,
        },
      ];

      await esClient.bulk({ index: tsdbStreamName, operations, refresh: true });
      await esClient.bulk({ index: extraStreamName, operations, refresh: true });
      await esClient.indices.putDataStreamSettings({
        name: extraStreamName,
        settings: { 'index.lifecycle.name': policyName, 'index.lifecycle.prefer_ilm': true },
      });

      await pageObjects.streams.gotoDataRetentionTab(tsdbStreamName);

      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);

      // Click ILM policy button and select the policy
      await page.getByRole('button', { name: 'ILM policy' }).click();
      const ilmListbox = page.getByRole('listbox', { name: 'Filter options' });
      await ilmListbox.waitFor();
      await page.getByPlaceholder('Filter options').fill(policyName);
      await page.getByTestId(`ilmPolicy-${policyName}`).click();
      await saveRetentionChanges(page);

      // Verify there is no downsampling step before editing
      await expect(page.getByTestId('downsamplingBar-label')).toHaveCount(0);

      // Edit warm phase and enable downsampling
      await page.getByTestId('lifecyclePhase-warm-button').click();
      await expect(page.getByTestId('lifecyclePhase-warm-editButton')).toBeVisible();
      await page.getByTestId('lifecyclePhase-warm-editButton').click();

      const flyout = page.getByTestId('streamsEditIlmPhasesFlyoutFromSummary');
      await expect(flyout).toBeVisible();
      await page.getByTestId('streamsEditIlmPhasesFlyoutFromSummaryTab-warm').click();

      // Scope to the visible "Downsampling" section (hot/warm/cold all exist in the DOM)
      await flyout.getByRole('switch', { name: 'Downsampling' }).click();

      // Set an explicit interval to keep the rendered step deterministic
      const intervalValue = page.locator(
        '[data-test-subj="streamsEditIlmPhasesFlyoutFromSummaryDownsamplingIntervalValue"]:visible'
      );
      await expect(intervalValue).toBeVisible();
      await intervalValue.fill('1');

      const intervalUnit = page.locator(
        '[data-test-subj="streamsEditIlmPhasesFlyoutFromSummaryDownsamplingIntervalUnit"]:visible'
      );
      await intervalUnit.selectOption('d');

      await page.getByTestId('streamsEditIlmPhasesFlyoutFromSummarySaveButton').click();

      await expect(page.getByTestId('editPolicyModalTitle')).toBeVisible();
      await page.getByTestId('editPolicyModal-overwriteButton').click();

      // Verify downsampling is rendered after saving edits
      await expect(page.getByTestId('downsamplingBar-label')).toBeVisible();
      await expect(page.getByTestId('downsamplingPhase-1d-label')).toBeVisible();
    } finally {
      await esClient.ilm.deleteLifecycle({ name: policyName }).catch(() => {});
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-edit-phase' })
        .catch(() => {});
      await esClient.indices
        .deleteDataStream({ name: 'streams-ilm-policy-tsdb-edit-phase-other' })
        .catch(() => {});
      await esClient.indices
        .deleteIndexTemplate({ name: 'streams-ilm-policy-tsdb-edit-phase-template' })
        .catch(() => {});
    }
  });
});
