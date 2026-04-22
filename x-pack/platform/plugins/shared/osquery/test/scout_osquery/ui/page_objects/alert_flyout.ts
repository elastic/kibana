/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { submitLiveQuery } from '../../common/submit_live_query';

const FLYOUT_OSQUERY_EDITOR = 'flyout-body-osquery';

/** Narrow shape for Monaco editor access in `page.evaluate`. */
type WindowWithMonaco = Omit<Window, 'MonacoEnvironment'> & {
  MonacoEnvironment?: {
    monaco?: {
      editor: {
        getModels: () => Array<{ getValue: () => string }>;
      };
    };
  };
};

export class AlertFlyoutPage {
  public readonly expandEventButton: Locator;
  public readonly flyoutFooterDropdown: Locator;
  public readonly osqueryActionItem: Locator;
  public readonly investigationGuideButton: Locator;
  public readonly submitButton: Locator;
  public readonly sendAlertToTimelineButton: Locator;
  public readonly flyoutBody: Locator;
  public readonly addToTimelineButton: Locator;
  public readonly cancelButton: Locator;
  private readonly flyoutOsqueryEditor: Locator;
  private readonly agentSelection: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyoutBody = this.page.testSubj.locator(FLYOUT_OSQUERY_EDITOR);
    this.flyoutOsqueryEditor = this.flyoutBody.getByTestId('osqueryEditor');
    this.expandEventButton = this.page.testSubj.locator('expand-event');
    this.flyoutFooterDropdown = this.page.testSubj.locator(
      'securitySolutionFlyoutFooterDropdownButton'
    );
    this.osqueryActionItem = this.page.testSubj.locator('osquery-action-item');
    this.investigationGuideButton = this.page.testSubj.locator(
      'securitySolutionFlyoutInvestigationGuideButton'
    );
    this.submitButton = this.flyoutBody.locator('[data-test-subj="liveQuerySubmitButton"]');
    this.sendAlertToTimelineButton = this.page.testSubj.locator('send-alert-to-timeline-button');
    this.addToTimelineButton = this.page.testSubj.locator('add-to-timeline');
    this.cancelButton = this.page.getByRole('button', { name: 'Cancel' });
    this.agentSelection = this.page.testSubj.locator('agentSelection');
  }

  async expandFirstAlert(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- the helper's purpose is to expand the first alert row; scoping is handled by the `openRuleAlertsView` navigation that precedes this call
    await this.expandEventButton.first().click();
  }

  async openTakeActionMenu(): Promise<void> {
    await this.flyoutFooterDropdown.click({ force: true });
  }

  async chooseOsqueryAction(): Promise<void> {
    await this.osqueryActionItem.click();
  }

  async openInvestigationGuide(): Promise<void> {
    await this.investigationGuideButton.click();
  }

  async doubleClickInvestigationGuideQuery(label: string): Promise<void> {
    await this.page
      .getByText(label, { exact: false })
      .waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.getByText(label, { exact: false }).dblclick({ force: true });
  }

  async clickFlyoutMonacoEditor(): Promise<void> {
    await this.waitForFlyoutEditorReady();
    await this.flyoutOsqueryEditor.click();
  }

  // Monaco's React wrapper syncs the editor value into react-hook-form on the
  // content-change callback, but the final keystrokes can still be in-flight when
  // Submit is clicked — resulting in a "query is required" validation error. After
  // typing, (a) blur Monaco's hidden textarea so any debounced change flushes, and
  // (b) wait until the Monaco model's text actually contains the typed query before
  // letting the caller proceed to Submit.
  async inputFlyoutQuery(query: string): Promise<void> {
    await this.waitForFlyoutEditorReady();
    await this.flyoutOsqueryEditor.click();
    await this.flyoutOsqueryEditor.pressSequentially(query, { delay: 5 });

    // Blur Monaco without pressing Tab/Enter (those would insert characters).
    await this.flyoutOsqueryEditor.evaluate((el: HTMLElement) => {
      el.querySelector<HTMLTextAreaElement>('textarea')?.blur();
    });

    // Wait for Monaco's model to actually carry the typed query before letting
    // the caller click Submit. The hidden textarea only buffers IME input, so we
    // have to read the editor model directly.
    await this.page.waitForFunction(
      (expected: string) => {
        const w = window as unknown as WindowWithMonaco;
        const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

        return models.some((m) => m.getValue().includes(expected));
      },
      query,
      { timeout: 10_000 }
    );
  }

  // The osquery flyout mounts asynchronously after the take-action menu picks "Run Osquery":
  // the agent selector first resolves against the alert's host and only then does the
  // LiveQueryForm render the Monaco editor. Waiting on the editor alone can race with
  // the agent-selection effect and leave the editor blank. We wait for the agent-count
  // chip first (matches the `N agent(s) selected` label the Cypress flow relied on) and
  // then for the osquery-scoped editor wrapper.
  async waitForFlyoutEditorReady(): Promise<void> {
    // The "Take action" path auto-selects the alert's host agent and renders
    // the "N agents selected" confirmation text. The "Investigation guide"
    // path doesn't auto-select — the user picks an agent manually — so the
    // text never appears via that flow. Race the editor's appearance against
    // the agents-selected text so we proceed as soon as either signal is
    // visible (editor presence alone is sufficient to know the form mounted).
    await Promise.race([
      this.page.getByText(/\d+ agents? selected/).waitFor({ state: 'visible', timeout: 60_000 }),
      this.flyoutOsqueryEditor.waitFor({ state: 'visible', timeout: 60_000 }),
    ]);
    await this.flyoutOsqueryEditor.waitFor({ state: 'visible', timeout: 60_000 });
  }

  // The mode selector is an `EuiCard` with the `selectable` prop. The card's onClick
  // lives on the selectable footer button, not on the description text — clicking
  // the description via `getByText` frequently fails to toggle the mode. Target the
  // card's role+name, then assert the pack selector's INPUT renders before continuing.
  async switchFlyoutToPackMode(): Promise<void> {
    const packCard = this.flyoutBody.locator('.euiCard', {
      has: this.page.getByText('Run a set of queries in a pack.'),
    });
    await packCard.waitFor({ state: 'visible', timeout: 15_000 });
    await packCard.click();
    // Wait for the search INPUT (not the wrapper div) to be visible. The
    // EuiComboBox wrapper re-renders a few times as React settles after the
    // mode toggle; the inner `comboBoxSearchInput` is a stable leaf so its
    // readiness is the cleanest signal that the selector is actually interactable.
    await this.packSearchInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async selectFlyoutPack(packName: string): Promise<void> {
    // Target the input directly rather than the outer combobox wrapper. The
    // wrapper (`select-live-pack`) detaches/remounts when the surrounding form
    // re-renders after the mode switch, causing strict-click retries to fail
    // even though Playwright eventually resolves to an element. The inner
    // `comboBoxSearchInput` is a stable leaf node that Playwright's auto-retry
    // resolves freshly on every action. Scope to the flyout body + the pack-
    // selector so we don't cross-match a different combobox elsewhere on the page.
    const searchInput = this.packSearchInput;
    await searchInput.click();
    await searchInput.fill(packName);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    // Confirm the pack is actually chosen before returning. EuiComboBox with
    // `singleSelection={asPlainText}` writes the selected option's label into
    // the input's `value` attribute.
    // NOTE: do NOT press Escape here — the key bubbles up and the surrounding
    // alert flyout also listens for Escape, which silently closes it.
    await expect(searchInput).toHaveValue(
      new RegExp(packName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  }

  async clickAddToCaseFromResults(): Promise<void> {
    const addToCase = this.flyoutBody.getByRole('button', { name: 'Add to Case' });
    // eslint-disable-next-line playwright/no-nth-methods -- the results panel renders an aggregate header "Add to Case" plus one per row; first-match targets the aggregate header action that drives the new-case flow (same semantics as the Cypress helper that preceded it)
    await addToCase.first().click();
  }

  async clearAgentsAndSelectAllAgents(): Promise<void> {
    await this.agentSelection.getByTestId('comboBoxClearButton').click();
    // `comboBoxInput` is the wrapper `<div tabindex="-1">` around the combobox;
    // Playwright's `.fill()` refuses to type into non-editable elements. The
    // actual typing target is `comboBoxSearchInput` — the inner `<input>`.
    const input = this.agentSelection.getByTestId('comboBoxSearchInput');
    await input.click();
    await input.fill('All');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    // Do NOT press Escape here — the key bubbles up and closes the surrounding
    // alert flyout (same rationale as `selectFlyoutPack`).
    await this.page
      .getByText('All agents')
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {});
  }

  // See `common/submit_live_query.ts` for why a plain click-and-hope is not
  // reliable here (Monaco debounce race + EuiButton re-render + toast overlays).
  async clickSubmitInFlyout(): Promise<void> {
    await submitLiveQuery(this.page, this.submitButton);
  }

  async clickAddToTimeline(): Promise<void> {
    await this.page
      .getByText('Add to Timeline investigation')
      .waitFor({ state: 'visible', timeout: 180_000 });
    // eslint-disable-next-line playwright/no-nth-methods -- the live-query results table renders several add-to-timeline buttons (one per row); clicking the first attaches the aggregate action used by the flyout flow
    await this.addToTimelineButton.first().click();
  }

  async clickCancelInFlyout(): Promise<void> {
    await this.cancelButton.click();
  }

  private get packSearchInput(): Locator {
    return this.flyoutBody.locator(
      '[data-test-subj="select-live-pack"] [data-test-subj="comboBoxSearchInput"]'
    );
  }
}
