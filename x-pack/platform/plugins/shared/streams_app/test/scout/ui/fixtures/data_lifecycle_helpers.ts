/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ApiServicesFixture, type EsClient, type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { omit } from 'lodash';

export const RETENTION_TEST_IDS = {
  // Entry points (lifecycle summary header actions)
  editLifecycleMethodButton: 'dataLifecycleSummaryEditLifecycleMethod',
  addDeletePhaseButton: 'dataLifecycleSummaryAddDeletePhase',

  // Successful data: edit lifecycle method flyout
  successfulLifecycleFlyout: 'streamsEditSuccessfulDataLifecycleFlyout',
  successfulInheritCheckbox: 'dataLifecycleInheritCheckbox',
  successfulFlyoutApplyButton: 'dataLifecycleFlyoutApplyButton',
  successfulFlyoutCancelButton: 'dataLifecycleFlyoutCancelButton',

  // Successful data: delete phase flyout (custom DSL retention) — serverless "Add delete phase" flow
  successfulDeletePhaseFlyout: 'streamsEditSuccessfulDeletePhaseFlyout',
  successfulDeletePhaseValue: 'streamsEditSuccessfulDeletePhaseFlyoutDeleteAfterValue',
  successfulDeletePhaseUnit: 'streamsEditSuccessfulDeletePhaseFlyoutDeleteAfterUnit',
  successfulDeletePhaseApplyButton: 'streamsEditSuccessfulDeletePhaseFlyoutApplyButton',
  successfulDeletePhaseCancelButton: 'streamsEditSuccessfulDeletePhaseFlyoutCancelButton',
  successfulDeletePhaseRemoveButton:
    'streamsEditSuccessfulDeletePhaseFlyoutRemoveDeletePhaseButton',

  // Successful data: DLM data phases flyout (stateful "Add data phase" hot → frozen → delete flow).
  // On stateful the delete-only button/flyout above is replaced by this popover + flyout
  // (stateful is gated on `!isServerless`), so the delete phase is configured here instead.
  addDataPhaseButton: 'dataLifecycleSummaryAddDataPhaseButton',
  addDataPhasePopover: 'dataLifecycleSummaryAddDataPhasePopover',
  addDataPhaseFrozenOption: 'dataLifecycleSummaryAddDataPhaseOption-frozen',
  addDataPhaseDeleteOption: 'dataLifecycleSummaryAddDataPhaseOption-delete',
  frozenDefaultRepositoryRequiredBadge:
    'dataLifecycleSummaryAddDataPhaseOption-frozen-defaultRepositoryRequiredBadge',
  dataPhasesFlyout: 'streamsEditDataPhasesFlyout',
  dataPhasesFrozenPanel: 'streamsEditDataPhasesFlyoutPanel-frozen',
  dataPhasesDeletePanel: 'streamsEditDataPhasesFlyoutPanel-delete',
  // The frozen and delete panels render the same "move after" value/unit ids, so scope them to the
  // relevant panel (frozen/delete) before using.
  dataPhasesMoveAfterValue: 'streamsEditDataPhasesFlyoutMoveAfterValue',
  dataPhasesMoveAfterUnit: 'streamsEditDataPhasesFlyoutMoveAfterUnit',
  dataPhasesSaveButton: 'streamsEditDataPhasesFlyoutSaveButton',
  dataPhasesCancelButton: 'streamsEditDataPhasesFlyoutCancelButton',
  dataPhasesRemoveDeleteButton: 'streamsEditDataPhasesFlyoutRemoveDeletePhaseButton',

  // Frozen-phase gating "default snapshot repository required" modal.
  defaultRepositoryRequiredModalTitle: 'streamsDlmFrozenDefaultRepositoryRequiredModalTitle',
  defaultRepositoryRequiredModalRefreshButton:
    'streamsDlmFrozenDefaultRepositoryRequiredModalRefreshButton',

  // Timeline phase popover actions for the (successful data) delete phase — same in both flows.
  deletePhaseTimelineButton: 'lifecyclePhase-delete-button',
  deletePhaseTimelineEditButton: 'lifecyclePhase-delete-editButton',
  // Timeline phase popover actions for the frozen phase (stateful only). The id uses the localized,
  // capitalized display label ("Frozen").
  frozenPhaseTimelineButton: 'lifecyclePhase-Frozen-button',
  frozenPhaseTimelineEditButton: 'lifecyclePhase-Frozen-editButton',
  frozenPhaseTimelineRemoveButton: 'lifecyclePhase-Frozen-removeButton',

  // Lifecycle method cards (DLM / ILM)
  methodCardDlm: 'editDataLifecycle-methodCard-dlm',
  methodCardIlm: 'editDataLifecycle-methodCard-ilm',

  // ILM policy selector (inside the lifecycle method flyout when ILM is selected)
  ilmSearchInput: 'retentionSelectorSearchInput',
  ilmManagedFilterToggle: 'retentionSelectorIncludeManagedFilter',
  ilmPolicyRow: (policyName: string) =>
    `retentionSelectableRow-${policyName.replace(/[^a-zA-Z0-9]+/g, '_')}`,

  // Display elements
  retentionMetric: 'retention-metric',
  retentionMetricSubtitle: 'retention-metric-subtitle',
  retentionColumn: (streamName: string) => `retentionColumn-${streamName}`,
  failureStoreRetentionMetric: 'failureStoreRetention-metric',
  failureStoreRetentionMetricSubtitle: 'failureStoreRetention-metric-subtitle',

  // Failure store: edit failed lifecycle flyout
  failureStoreEnableButton: 'streamsAppFailureStoreEnableButton',
  failureStoreEditButton: 'failureStoreSummaryEditFailedLifecycle',
  failureStoreAddDeletePhaseButton: 'failureStoreSummaryAddDeletePhase',
  failedLifecycleFlyout: 'streamsEditFailedDataLifecycleFlyout',
  failedInheritCheckbox: 'dataLifecycleInheritCheckbox',
  enableFailureStoreCheckbox: 'editFailedDataLifecycle-enableFailureStoreCheckbox',
  failedFlyoutApplyButton: 'dataLifecycleFlyoutApplyButton',
  failedFlyoutCancelButton: 'dataLifecycleFlyoutCancelButton',

  // Failure store: delete phase flyout (custom failed retention)
  failedDeletePhaseFlyout: 'streamsEditFailedDeletePhaseFlyout',
  failedDeletePhaseValue: 'streamsEditFailedDeletePhaseFlyoutDeleteAfterValue',
  failedDeletePhaseUnit: 'streamsEditFailedDeletePhaseFlyoutDeleteAfterUnit',
  failedDeletePhaseApplyButton: 'streamsEditFailedDeletePhaseFlyoutApplyButton',
} as const;

/**
 * Sets the DSL lifecycle for a stream via the Streams API.
 *
 * Preserves the stream's existing ingest config and strips the read-only
 * `processing.updated_at` field (the PUT endpoint rejects it), then applies the
 * provided `dsl` lifecycle. Used by specs to seed a known lifecycle state before
 * navigating to the data lifecycle tab.
 */
export async function setStreamDslLifecycle(
  streamsApi: ApiServicesFixture['streams'],
  streamName: string,
  dsl: Record<string, unknown>
): Promise<void> {
  const { stream } = await streamsApi.getStreamDefinition(streamName);
  await streamsApi.updateStream(streamName, {
    ingest: {
      ...stream.ingest,
      processing: omit(stream.ingest.processing, 'updated_at'),
      lifecycle: { dsl },
    },
  });
}

/**
 * The managed snapshot repository every Elastic Cloud (ECH) deployment ships with. Cloud has no
 * node-local filesystem path (`path.repo` is empty), so a default repository must reuse this one
 * instead of registering an `fs` repository the way the local Scout cluster can.
 */
export const CLOUD_DEFAULT_SNAPSHOT_REPOSITORY = 'found-snapshots';
const LOCAL_FS_SNAPSHOT_REPOSITORY_LOCATION = '/tmp/repo';

export interface ManagedDefaultSnapshotRepository {
  /** Name of the repository set as the cluster's default. */
  name: string;
  /** Restores "no default repository" and removes anything this helper created. */
  cleanup: () => Promise<void>;
}

/**
 * Registers a default snapshot repository so the frozen-phase gate is satisfied, branching on the
 * deployment (pass `config.isCloud`):
 *
 * - Local Scout stateful cluster: registers an `fs` repository at `path.repo` (`/tmp/repo`).
 * - Elastic Cloud (ECH): has no node-local `path.repo`, so reuses the managed `found-snapshots`
 *   repository that every deployment ships with (never creates or deletes it).
 */
export async function setDefaultSnapshotRepository(
  esClient: EsClient,
  isCloud: boolean,
  fsRepositoryName: string
): Promise<ManagedDefaultSnapshotRepository> {
  const name = isCloud ? CLOUD_DEFAULT_SNAPSHOT_REPOSITORY : fsRepositoryName;

  if (!isCloud) {
    await esClient.snapshot.createRepository({
      name: fsRepositoryName,
      repository: { type: 'fs', settings: { location: LOCAL_FS_SNAPSHOT_REPOSITORY_LOCATION } },
    });
  }

  await esClient.cluster.putSettings({
    persistent: { 'repositories.default_repository': name },
  });

  return {
    name,
    cleanup: async () => {
      await esClient.cluster.putSettings({
        persistent: { 'repositories.default_repository': null },
      });
      // Only remove what we created; never delete the managed Cloud repository.
      if (!isCloud) {
        await esClient.snapshot.deleteRepository({ name: fsRepositoryName }).catch(() => {});
      }
    },
  };
}

/**
 * Confirms the "This will override index template settings" modal.
 */
async function confirmOverride(page: ScoutPage): Promise<void> {
  const overrideButton = page.getByTestId('overrideSettingsModal-overrideButton');
  await overrideButton.click();
  await overrideButton.waitFor({ state: 'hidden' });
}

/**
 * Opens the "edit lifecycle method" flyout (inherit + DLM/ILM) for successful data.
 */
export async function openLifecycleMethodFlyout(page: ScoutPage): Promise<Locator> {
  await page.getByTestId(RETENTION_TEST_IDS.editLifecycleMethodButton).click();
  const flyout = page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout);
  await flyout.waitFor({ state: 'visible' });
  return flyout;
}

/**
 * Saves the lifecycle method flyout changes (Apply) and waits for it to close.
 */
export async function saveRetentionChanges(
  page: ScoutPage,
  { expectOverrideConfirmation = false }: { expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  await page.getByTestId(RETENTION_TEST_IDS.successfulFlyoutApplyButton).click();
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
  await page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout).waitFor({ state: 'hidden' });
}

/**
 * Cancels the lifecycle method flyout and waits for it to close.
 */
export async function cancelRetentionChanges(page: ScoutPage): Promise<void> {
  await page.getByTestId(RETENTION_TEST_IDS.successfulFlyoutCancelButton).click();
  await page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout).waitFor({ state: 'hidden' });
}

/**
 * Toggles the "inherit lifecycle" checkbox inside the lifecycle method flyout.
 *
 * No assertion on the resulting state is made here (assertions belong in specs);
 * the caller's next interaction relies on the toggled state and will fail if it
 * did not flip.
 */
export async function toggleInheritSwitch(page: ScoutPage, enabled: boolean): Promise<void> {
  const inheritCheckbox = page.getByTestId(RETENTION_TEST_IDS.successfulInheritCheckbox);
  await inheritCheckbox.waitFor({ state: 'visible' });
  const isChecked = await inheritCheckbox.isChecked();

  if (isChecked !== enabled) {
    await inheritCheckbox.click();
  }
}

/**
 * Selects the ILM lifecycle method inside the lifecycle method flyout.
 */
async function selectIlmMethod(page: ScoutPage): Promise<void> {
  const card = page.getByTestId(RETENTION_TEST_IDS.methodCardIlm);
  await card.waitFor({ state: 'visible' });
  await card.getByRole('radio').click();
}

/**
 * Selects an ILM policy by name in the ILM retention selector.
 * Pass `{ managed: true }` for managed/system policies — they are
 * hidden behind a filter toggle by default. The helper then waits for the toggle to appear before
 * clicking it, so the caller's intent is explicit and the wait is reliable.
 */
export async function selectIlmPolicy(
  page: ScoutPage,
  policyName: string,
  { managed = false }: { managed?: boolean } = {}
): Promise<void> {
  await selectIlmMethod(page);
  const search = page.getByTestId(RETENTION_TEST_IDS.ilmSearchInput);
  await search.waitFor({ state: 'visible' });

  if (managed) {
    const toggle = page.getByTestId(RETENTION_TEST_IDS.ilmManagedFilterToggle);
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
  }

  await search.fill(policyName);
  await page.getByTestId(RETENTION_TEST_IDS.ilmPolicyRow(policyName)).click();
}

/**
 * Handle to the flyout used to configure the (successful data) delete phase, abstracting over the
 * two deployment flows: stateful configures the delete phase inside the multi-phase DLM "data
 * phases" flyout, serverless uses the dedicated delete-phase flyout (gated on `!isServerless`).
 * {@link openDeletePhaseEditor} detects the active flow and returns the matching locators/ids so
 * callers work unchanged in both environments.
 */
interface DeletePhaseEditor {
  // Top-level flyout locator — used to wait for the flyout to close.
  flyout: Locator;
  // Container the value/unit fields are scoped to (the delete panel in the data phases flyout, so a
  // coexisting frozen panel can't match the same ids; the whole flyout in the delete-only flyout).
  fields: Locator;
  valueTestId: string;
  unitTestId: string;
  applyTestId: string;
  cancelTestId: string;
  removeTestId: string;
  // Stateful "data phases" flyout: the remove button only edits the form (delete.enabled = false),
  // so the change must then be saved. Serverless: the remove button applies and closes immediately.
  isDataPhaseFlow: boolean;
}

const dataPhaseFlow = (page: ScoutPage): DeletePhaseEditor => {
  const flyout = page.getByTestId(RETENTION_TEST_IDS.dataPhasesFlyout);
  return {
    flyout,
    fields: flyout.getByTestId(RETENTION_TEST_IDS.dataPhasesDeletePanel),
    valueTestId: RETENTION_TEST_IDS.dataPhasesMoveAfterValue,
    unitTestId: RETENTION_TEST_IDS.dataPhasesMoveAfterUnit,
    applyTestId: RETENTION_TEST_IDS.dataPhasesSaveButton,
    cancelTestId: RETENTION_TEST_IDS.dataPhasesCancelButton,
    removeTestId: RETENTION_TEST_IDS.dataPhasesRemoveDeleteButton,
    isDataPhaseFlow: true,
  };
};

const deleteOnlyFlow = (page: ScoutPage): DeletePhaseEditor => {
  const flyout = page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout);
  return {
    flyout,
    fields: flyout,
    valueTestId: RETENTION_TEST_IDS.successfulDeletePhaseValue,
    unitTestId: RETENTION_TEST_IDS.successfulDeletePhaseUnit,
    applyTestId: RETENTION_TEST_IDS.successfulDeletePhaseApplyButton,
    cancelTestId: RETENTION_TEST_IDS.successfulDeletePhaseCancelButton,
    removeTestId: RETENTION_TEST_IDS.successfulDeletePhaseRemoveButton,
    isDataPhaseFlow: false,
  };
};

/**
 * Opens the editor for the (successful data) delete phase and returns a {@link DeletePhaseEditor}
 * handle. This is the single shared entry point for adding/editing the delete phase in either
 * deployment: on stateful it opens the multi-phase "Add data phase" popover + DLM data phases
 * flyout, on serverless the dedicated "Add delete phase" button + flyout. The active flow is
 * detected from whichever entry point / flyout the UI renders, so callers don't need to know the
 * deployment mode.
 */
export async function openDeletePhaseEditor(
  page: ScoutPage,
  { existing = false }: { existing?: boolean } = {}
): Promise<DeletePhaseEditor> {
  if (existing) {
    // Editing an existing delete phase goes through the timeline phase popover in both flows; only
    // the resulting flyout differs.
    const deletePhaseButton = page.getByTestId(RETENTION_TEST_IDS.deletePhaseTimelineButton);
    await deletePhaseButton.waitFor({ state: 'visible' });
    await deletePhaseButton.click();
    await page.getByTestId(RETENTION_TEST_IDS.deletePhaseTimelineEditButton).click();
  } else {
    const addDataPhaseButton = page.getByTestId(RETENTION_TEST_IDS.addDataPhaseButton);
    const addDeletePhaseButton = page.getByTestId(RETENTION_TEST_IDS.addDeletePhaseButton);
    // Exactly one entry point is rendered depending on the deployment (the other is not mounted, so
    // `.or()` resolves to a single element). Wait for whichever it is, then take that path.
    await addDataPhaseButton.or(addDeletePhaseButton).waitFor({ state: 'visible' });
    if (await addDataPhaseButton.isVisible()) {
      await addDataPhaseButton.click();
      await page.getByTestId(RETENTION_TEST_IDS.addDataPhaseDeleteOption).click();
    } else {
      await addDeletePhaseButton.click();
    }
  }

  // Only one of the two flyouts is ever mounted; wait for whichever appears and return its ids.
  const dataPhasesFlyout = page.getByTestId(RETENTION_TEST_IDS.dataPhasesFlyout);
  const deleteOnlyFlyout = page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout);
  await dataPhasesFlyout.or(deleteOnlyFlyout).waitFor({ state: 'visible' });

  return (await dataPhasesFlyout.isVisible()) ? dataPhaseFlow(page) : deleteOnlyFlow(page);
}

/**
 * Sets a custom DSL retention (delete phase) for successful data.
 * Opens the delete-phase editor ({@link openDeletePhaseEditor} resolves the stateful vs serverless
 * flow), fills the value/unit and applies.
 */
export async function setCustomRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd',
  {
    existing = false,
    expectOverrideConfirmation = false,
  }: { existing?: boolean; expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  const { flyout, fields, valueTestId, unitTestId, applyTestId } = await openDeletePhaseEditor(
    page,
    { existing }
  );

  const field = fields.getByTestId(valueTestId);
  await field.fill('');
  await field.fill(value);

  await fields.getByTestId(unitTestId).selectOption(unit);

  // Blur so the field commits before submit.
  await fields.getByTestId(unitTestId).click();

  await page.getByTestId(applyTestId).click();
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
  await flyout.waitFor({ state: 'hidden' });
}

/**
 * Removes the delete phase (resets to indefinite retention) for successful data.
 */
export async function removeDeletePhase(
  page: ScoutPage,
  { expectOverrideConfirmation = false }: { expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  const { flyout, removeTestId, applyTestId, isDataPhaseFlow } = await openDeletePhaseEditor(page, {
    existing: true,
  });
  await page.getByTestId(removeTestId).click();
  // In the stateful "data phases" flyout the remove button only clears the phase in the form; the
  // change still has to be saved. The serverless flyout removes and closes in one click.
  if (isDataPhaseFlow) {
    await page.getByTestId(applyTestId).click();
  }
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
  await flyout.waitFor({ state: 'hidden' });
}

/**
 * Best-effort close of any currently visible toasts.
 */
export async function closeToastsIfPresent(page: ScoutPage): Promise<void> {
  const toastCloseButtons = page.getByTestId('toastCloseButton');
  for (const button of await toastCloseButtons.all()) {
    await button.click({ timeout: 1000 }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Failure store helpers
// ---------------------------------------------------------------------------

/**
 * Opens the "edit failed data lifecycle" flyout from the enabled summary (the
 * controls/edit action). Pin the failure store as enabled via the API before
 * calling so this entry point is deterministic.
 */
export async function openFailureStoreFlyout(page: ScoutPage): Promise<Locator> {
  await page.getByTestId(RETENTION_TEST_IDS.failureStoreEditButton).click();
  const flyout = page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout);
  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Opens the "edit failed data lifecycle" flyout from the disabled panel (the
 * "Enable failure store" action). Pin the failure store as disabled via the API
 * before calling so this entry point is deterministic.
 */
async function openDisabledFailureStoreFlyout(page: ScoutPage): Promise<Locator> {
  await page.getByTestId(RETENTION_TEST_IDS.failureStoreEnableButton).click();
  const flyout = page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout);
  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Saves failure store changes in the shared failure store modal
 * (`@kbn/failure-store-modal`, used from the data quality page).
 */
export async function saveFailureStoreChanges(page: ScoutPage): Promise<void> {
  const saveButton = page.getByTestId('failureStoreModalSaveButton');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
}

/**
 * Saves the streams "edit failed data lifecycle" flyout (Apply) and waits for it to close.
 */
export async function applyFailedLifecycleFlyout(
  page: ScoutPage,
  { expectOverrideConfirmation = false }: { expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  const saveButton = page.getByTestId(RETENTION_TEST_IDS.failedFlyoutApplyButton);
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
  await expect(page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout)).toBeHidden();
}

/**
 * Sets the failure store enabled/disabled state through the edit failed
 * lifecycle flyout. The starting state must be pinned via
 * `pinFailureStore` in setup so the entry point is
 * deterministic: enabling starts from the disabled panel ("Enable failure
 * store"), disabling starts from the edit button on the enabled panel.
 */
export async function setFailureStoreEnabled(
  page: ScoutPage,
  enabled: boolean,
  { expectOverrideConfirmation = false }: { expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  if (enabled) {
    await openDisabledFailureStoreFlyout(page);
  } else {
    await openFailureStoreFlyout(page);
  }

  const checkbox = page.getByTestId(RETENTION_TEST_IDS.enableFailureStoreCheckbox);
  await checkbox.waitFor({ state: 'visible' });
  if (enabled) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }

  await applyFailedLifecycleFlyout(page, { expectOverrideConfirmation });
}

/**
 * Sets a custom failure store retention by opening the failed delete-phase flyout
 * via the "Add delete phase" action. Requires the failure store to be enabled
 * with no delete phase yet (pin this via `pinFailureStore`).
 */
export async function setFailureStoreRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd',
  {
    existingDeletePhase = false,
    expectOverrideConfirmation = false,
  }: { existingDeletePhase?: boolean; expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  const flyout = page.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseFlyout);

  const addDeletePhaseButton = page.getByTestId(
    RETENTION_TEST_IDS.failureStoreAddDeletePhaseButton
  );

  if (existingDeletePhase) {
    await page.getByTestId('failureStore-lifecyclePhase-delete-button').click();
    await page.getByTestId('lifecyclePhase-delete-editButton').click();
  } else {
    await expect(addDeletePhaseButton).toBeEnabled();
    await addDeletePhaseButton.click();
  }
  await expect(flyout).toBeVisible();

  const field = flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseValue);
  await field.fill('');
  await field.fill(value);
  await flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseUnit).selectOption(unit);
  await flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseUnit).click();

  await page.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseApplyButton).click();
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
  await expect(flyout).toBeHidden();
}

/**
 * Removes the failure store delete phase (sets retention to indefinite / disables lifecycle)
 * via the phase popover remove action. Requires the failure store to be enabled with a delete phase.
 */
export async function removeFailureStoreDeletePhase(
  page: ScoutPage,
  { expectOverrideConfirmation = false }: { expectOverrideConfirmation?: boolean } = {}
): Promise<void> {
  await page.getByTestId('failureStore-lifecyclePhase-delete-button').click();
  await page.getByTestId('lifecyclePhase-delete-removeButton').click();
  if (expectOverrideConfirmation) {
    await confirmOverride(page);
  }
}
