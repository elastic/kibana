/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { omit } from 'lodash';

import { test } from '../../../fixtures';
import { closeToastsIfPresent } from '../../../fixtures/data_lifecycle_helpers';

const STREAM = 'logs.otel.nginx';

// Test IDs for the stateful DLM "Add data phase" flow (issue #267912).
const ADD_DATA_PHASE_BUTTON = 'dataLifecycleSummaryAddDataPhaseButton';
const ADD_DELETE_PHASE_BUTTON = 'dataLifecycleSummaryAddDeletePhase';
const ADD_DATA_PHASE_POPOVER = 'dataLifecycleSummaryAddDataPhasePopover';
const FROZEN_OPTION = 'dataLifecycleSummaryAddDataPhaseOption-frozen';
const DELETE_OPTION = 'dataLifecycleSummaryAddDataPhaseOption-delete';
const FROZEN_DEFAULT_REPO_BADGE =
  'dataLifecycleSummaryAddDataPhaseOption-frozen-defaultRepositoryRequiredBadge';
const DATA_PHASES_FLYOUT = 'streamsEditDataPhasesFlyout';
const DATA_PHASES_FLYOUT_FROZEN_PANEL = 'streamsEditDataPhasesFlyoutPanel-frozen';
const DATA_PHASES_FLYOUT_DELETE_PANEL = 'streamsEditDataPhasesFlyoutPanel-delete';
// Both the frozen and delete panels render the same "move after" value/unit test ids, so callers
// must scope these to the relevant panel (…Panel-frozen / …Panel-delete) before using them.
const DATA_PHASES_FLYOUT_MOVE_AFTER_VALUE = 'streamsEditDataPhasesFlyoutMoveAfterValue';
const DATA_PHASES_FLYOUT_MOVE_AFTER_UNIT = 'streamsEditDataPhasesFlyoutMoveAfterUnit';
const DATA_PHASES_FLYOUT_SAVE = 'streamsEditDataPhasesFlyoutSaveButton';
const DEFAULT_REPO_MODAL_TITLE = 'streamsDlmFrozenDefaultRepositoryRequiredModalTitle';
// The frozen phase's timeline test id uses its localized, capitalized display label ("Frozen").
const FROZEN_PHASE_BUTTON = 'lifecyclePhase-Frozen-button';
const FROZEN_PHASE_EDIT_BUTTON = 'lifecyclePhase-Frozen-editButton';
const FROZEN_PHASE_REMOVE_BUTTON = 'lifecyclePhase-Frozen-removeButton';

// The "Add data phase" flow (hot → frozen → delete) is a stateful-only feature: serverless has no
// tiers and uses the dedicated "Add delete phase" button instead.
test.describe(
  'Stream data retention - Add data phase flow',
  { tag: [...tags.stateful.classic] },
  () => {
    // Saved before clearing so afterAll can restore the environment to its original state.
    let savedDefaultRepository: string | null = null;

    test.beforeAll(async ({ apiServices, esClient }) => {
      // Explicitly clear the cluster's default snapshot repository so the frozen-phase gating tests
      // are deterministic regardless of how the CI environment is configured.
      const settings = await esClient.cluster.getSettings({
        filter_path: 'persistent.repositories.default_repository',
      });
      savedDefaultRepository =
        (settings.persistent?.repositories as { default_repository?: string } | undefined)
          ?.default_repository ?? null;
      await esClient.cluster.putSettings({
        persistent: { 'repositories.default_repository': null },
      });

      await apiServices.streams.clearStreamChildren('logs.otel');
      const logsDefinition = await apiServices.streams.getStreamDefinition('logs.otel');
      await apiServices.streams.updateStream('logs.otel', {
        ingest: {
          ...logsDefinition.stream.ingest,
          processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: {} },
        },
      });
      await apiServices.streams.forkStream('logs.otel', STREAM, {
        field: 'service.name',
        eq: 'nginx',
      });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      const childDefinition = await apiServices.streams.getStreamDefinition(STREAM);
      await apiServices.streams.updateStream(STREAM, {
        ingest: {
          ...childDefinition.stream.ingest,
          processing: omit(childDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: {} },
        },
      });
      await pageObjects.streams.gotoDataRetentionTab(STREAM);
    });

    test.afterEach(async ({ page }) => {
      await closeToastsIfPresent(page);
    });

    test.afterAll(async ({ apiServices, esClient }) => {
      // Restore the default repository to whatever the environment had before this suite ran.
      await esClient.cluster.putSettings({
        persistent: { 'repositories.default_repository': savedDefaultRepository },
      });
      await apiServices.streams.clearStreamChildren('logs.otel');
    });

    test('replaces "Add delete phase" with the "Add data phase" popover offering frozen and delete', async ({
      page,
    }) => {
      await expect(page.getByTestId(ADD_DATA_PHASE_BUTTON)).toBeVisible();
      await expect(page.getByTestId(ADD_DELETE_PHASE_BUTTON)).toBeHidden();

      await page.getByTestId(ADD_DATA_PHASE_BUTTON).click();

      await expect(page.getByTestId(ADD_DATA_PHASE_POPOVER)).toBeVisible();
      await expect(page.getByTestId(FROZEN_OPTION)).toBeVisible();
      await expect(page.getByTestId(DELETE_OPTION)).toBeVisible();
    });

    test('adds a delete phase through the data phases flyout', async ({ page }) => {
      await test.step('open the data phases flyout on the delete phase', async () => {
        await page.getByTestId(ADD_DATA_PHASE_BUTTON).click();
        await page.getByTestId(DELETE_OPTION).click();
        await page.getByTestId(DATA_PHASES_FLYOUT).waitFor({ state: 'visible' });
      });

      await test.step('configure and save the delete phase', async () => {
        const deletePanel = page.getByTestId(DATA_PHASES_FLYOUT_DELETE_PANEL);
        const value = deletePanel.getByTestId(DATA_PHASES_FLYOUT_MOVE_AFTER_VALUE);
        await value.fill('');
        await value.fill('30');
        await deletePanel.getByTestId(DATA_PHASES_FLYOUT_MOVE_AFTER_UNIT).selectOption('d');

        await page.getByTestId(DATA_PHASES_FLYOUT_SAVE).click();
        await page.getByTestId(DATA_PHASES_FLYOUT).waitFor({ state: 'hidden' });
      });

      await test.step('the timeline reflects the new delete phase', async () => {
        await expect(page.getByTestId('lifecyclePhase-delete-button')).toBeVisible();
        await expect(page.getByTestId('retention-metric-subtitle')).toContainText('2 data phases');
      });
    });

    test('adds a frozen phase through the data phases flyout when a default repository exists', async ({
      page,
      esClient,
      apiServices,
      pageObjects,
    }) => {
      // The frozen phase is gated on a default snapshot repository (the suite's beforeAll cleared
      // it). Register a real fs repository (the Scout stateful cluster sets `path.repo=/tmp/repo`)
      // and set it as the cluster default so the gate passes and the flyout — not the gating modal —
      // opens. The finally block restores the suite's "no default repository" invariant so sibling
      // tests are unaffected regardless of execution order.
      const REPO_NAME = 'streams-frozen-phase-test-repo';
      await esClient.snapshot.createRepository({
        name: REPO_NAME,
        repository: { type: 'fs', settings: { location: '/tmp/repo' } },
      });
      await esClient.cluster.putSettings({
        persistent: { 'repositories.default_repository': REPO_NAME },
      });

      try {
        // Reset to a clean DSL lifecycle and reload so the gating hook re-fetches the new default.
        const childDefinition = await apiServices.streams.getStreamDefinition(STREAM);
        await apiServices.streams.updateStream(STREAM, {
          ingest: {
            ...childDefinition.stream.ingest,
            processing: omit(childDefinition.stream.ingest.processing, 'updated_at'),
            lifecycle: { dsl: {} },
          },
        });
        await pageObjects.streams.gotoDataRetentionTab(STREAM);

        await test.step('open the data phases flyout on the frozen phase (no gating)', async () => {
          await page.getByTestId(ADD_DATA_PHASE_BUTTON).click();
          // With a default repository present the frozen option is enabled and shows no gating badge.
          await expect(page.getByTestId(FROZEN_DEFAULT_REPO_BADGE)).toBeHidden();

          await page.getByTestId(FROZEN_OPTION).click();

          // Frozen opens the data phases flyout directly instead of the gating modal.
          await expect(page.getByTestId(DEFAULT_REPO_MODAL_TITLE)).toBeHidden();
          await page.getByTestId(DATA_PHASES_FLYOUT).waitFor({ state: 'visible' });
          await expect(page.getByTestId(DATA_PHASES_FLYOUT_FROZEN_PANEL)).toBeVisible();
        });

        await test.step('configure and save the frozen phase', async () => {
          const frozenPanel = page.getByTestId(DATA_PHASES_FLYOUT_FROZEN_PANEL);
          const value = frozenPanel.getByTestId(DATA_PHASES_FLYOUT_MOVE_AFTER_VALUE);
          await value.fill('');
          await value.fill('10');
          await frozenPanel.getByTestId(DATA_PHASES_FLYOUT_MOVE_AFTER_UNIT).selectOption('d');

          await page.getByTestId(DATA_PHASES_FLYOUT_SAVE).click();
          await page.getByTestId(DATA_PHASES_FLYOUT).waitFor({ state: 'hidden' });
        });

        await test.step('the timeline reflects the new frozen phase', async () => {
          await expect(page.getByTestId(FROZEN_PHASE_BUTTON)).toBeVisible();
        });
      } finally {
        await esClient.cluster.putSettings({
          persistent: { 'repositories.default_repository': null },
        });
        await esClient.snapshot.deleteRepository({ name: REPO_NAME }).catch(() => {});
      }
    });

    test('gates the frozen phase behind the "default snapshot repository required" modal', async ({
      page,
    }) => {
      // beforeAll cleared `persistent.repositories.default_repository`, so this cluster has no
      // default repository. The stateful CI cluster runs a trial (Enterprise) license, so the
      // enterprise gate passes and the missing-repository modal is shown instead.
      await page.getByTestId(ADD_DATA_PHASE_BUTTON).click();
      await expect(page.getByTestId(FROZEN_DEFAULT_REPO_BADGE)).toBeVisible();

      await page.getByTestId(FROZEN_OPTION).click();

      // Selecting frozen opens the gating modal instead of the edit flyout.
      await expect(page.getByTestId(DEFAULT_REPO_MODAL_TITLE)).toBeVisible();
      await expect(page.getByTestId(DATA_PHASES_FLYOUT)).toBeHidden();
    });

    test('opens the data phases flyout when editing an existing phase from the timeline', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const childDefinition = await apiServices.streams.getStreamDefinition(STREAM);
      await apiServices.streams.updateStream(STREAM, {
        ingest: {
          ...childDefinition.stream.ingest,
          processing: omit(childDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: { data_retention: '30d' } },
        },
      });
      await pageObjects.streams.gotoDataRetentionTab(STREAM);

      await page.getByTestId('lifecyclePhase-delete-button').click();
      await page.getByTestId('lifecyclePhase-delete-editButton').click();

      await expect(page.getByTestId(DATA_PHASES_FLYOUT)).toBeVisible();
      await expect(page.getByTestId(`${DATA_PHASES_FLYOUT}Panel-delete`)).toBeVisible();
    });

    test('disables "Add data phase" when both frozen and delete phases are configured', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const childDefinition = await apiServices.streams.getStreamDefinition(STREAM);
      await apiServices.streams.updateStream(STREAM, {
        ingest: {
          ...childDefinition.stream.ingest,
          processing: omit(childDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: { frozen_after: '10d', data_retention: '30d' } },
        },
      });
      await pageObjects.streams.gotoDataRetentionTab(STREAM);

      await expect(page.getByTestId(ADD_DATA_PHASE_BUTTON)).toBeDisabled();
    });

    test('edits and removes the frozen phase from its timeline popover', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const childDefinition = await apiServices.streams.getStreamDefinition(STREAM);
      await apiServices.streams.updateStream(STREAM, {
        ingest: {
          ...childDefinition.stream.ingest,
          processing: omit(childDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: { frozen_after: '10d' } },
        },
      });
      await pageObjects.streams.gotoDataRetentionTab(STREAM);

      // The frozen phase's timeline label is the localized, capitalized "Frozen".
      await test.step('edit opens the data phases flyout (no gating on an existing phase)', async () => {
        await page.getByTestId(FROZEN_PHASE_BUTTON).click();
        await page.getByTestId(FROZEN_PHASE_EDIT_BUTTON).click();
        await expect(page.getByTestId(DATA_PHASES_FLYOUT)).toBeVisible();
        await expect(page.getByTestId(`${DATA_PHASES_FLYOUT}Panel-frozen`)).toBeVisible();
      });

      await test.step('remove deletes the frozen phase from the timeline', async () => {
        await page.getByTestId(`${DATA_PHASES_FLYOUT}CancelButton`).click();
        await page.getByTestId(DATA_PHASES_FLYOUT).waitFor({ state: 'hidden' });

        await page.getByTestId(FROZEN_PHASE_BUTTON).click();
        await page.getByTestId(FROZEN_PHASE_REMOVE_BUTTON).click();

        await expect(page.getByTestId(FROZEN_PHASE_BUTTON)).toBeHidden();
      });
    });
  }
);
