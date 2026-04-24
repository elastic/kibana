/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { submitLiveQuery } from '../../common/submit_live_query';
import { waitForMonacoContains } from '../../common/monaco_helpers';
import { selectSingleAsPlainTextOption } from '../../common/combo_box_helpers';

const FLYOUT_OSQUERY_EDITOR = 'flyout-body-osquery';

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
  public readonly timelineModalHeader: Locator;
  public readonly timelineExpandEventToggle: Locator;
  private readonly flyoutOsqueryEditor: Locator;
  private readonly agentSelection: Locator;

  constructor(private readonly page: ScoutPage) {
    // Several `flyout-body-osquery` nodes can exist in the DOM (e.g. alert +
    // timeline, or prior portal shells). A bare `testSubj.locator` matches all
    // of them — clicks then hit a hidden root while the user-visible flyout
    // never leaves "Single query" (pack switch / combobox appear to no-op).
    // Match `alert_parameter_substitution.spec.ts`: last *visible* portal root.
    this.flyoutBody = this.page
      .getByTestId(FLYOUT_OSQUERY_EDITOR)
      .filter({ visible: true })
      // eslint-disable-next-line playwright/no-nth-methods -- stacked Security flyouts; the active Osquery editor mounts last among visible roots
      .last();
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
    // Same multi-root issue as `flyoutBody`: a page-wide `agentSelection` hits
    // the wrong (hidden) live-query shell — clears/type there while the visible
    // flyout still has the alert's single agent, so Submit never passes RHF or
    // the POST never matches what the test expects.
    this.agentSelection = this.flyoutBody.getByTestId('agentSelection');
    this.timelineModalHeader = this.page.testSubj.locator('timeline-modal-header-panel');
    this.timelineExpandEventToggle = this.page.testSubj.locator('docTableExpandToggleColumn');
  }

  // Drives the "Investigate in timeline" icon on an alert row and expands the
  // first event in the timeline that opens. Exists as a single helper because
  // the Playwright-strict version of this sequence has two well-known pitfalls:
  //   1. `send-alert-to-timeline-button` is an EuiButtonIcon whose EuiToolTip
  //      ("Investigate in timeline") is rendered in a `data-euiportal` subtree.
  //      Playwright clicks without moving the cursor afterwards, so the
  //      tooltip stays mounted and overlays the timeline's first-row expand
  //      toggle, intercepting the next click. We dismiss the tooltip by
  //      moving the pointer to (0, 0) before targeting the toggle.
  //   2. The timeline overlay mounts incrementally — the grid rows attach,
  //      detach, and reattach while redux hydrates the linked alert. Clicking
  //      `docTableExpandToggleColumn` during that window triggers Playwright's
  //      "element was detached from the DOM" retry loop and can exhaust the
  //      default 10 s budget on CI. Anchoring on `timeline-modal-header-panel`
  //      first guarantees the overlay's redux store has produced its first
  //      stable render before we touch the row.
  async openFirstAlertInTimelineAndExpand(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- one "send alert to timeline" button per alert row; first-match drives the top alert into Timeline
    await this.sendAlertToTimelineButton.first().click();
    await this.timelineModalHeader.waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.mouse.move(0, 0);
    // eslint-disable-next-line playwright/no-nth-methods -- the timeline grid renders one expand toggle per event row; first-match expands the topmost event which is the alert we just linked
    const firstExpandToggle = this.timelineExpandEventToggle.first();
    await firstExpandToggle.waitFor({ state: 'visible', timeout: 30_000 });
    await firstExpandToggle.click();
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
    await waitForMonacoContains(this.page, query, { timeoutMs: 10_000 });
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
  // lives on the selectable `button[role='switch']`, not on the body — clicking the
  // wrapper often hits a no-op region. After a toggle, React can still re-render
  // (agent resolution, packs query) and snap back to "Single query", so we click the
  // switch, wait for the UI to settle, and only proceed when the pack combobox input
  // stays mounted (`queryType === 'pack'` in live_queries/form/index.tsx).
  async switchFlyoutToPackMode(): Promise<void> {
    const packCard = this.flyoutBody.locator('.euiCard', {
      has: this.page.getByText('Run a set of queries in a pack.'),
    });
    const packToggle = packCard.locator('button[role="switch"]');
    const packModeInput = this.flyoutBody.locator(
      '[data-test-subj="select-live-pack"] [data-test-subj="comboBoxSearchInput"]'
    );

    await packCard.waitFor({ state: 'visible', timeout: 15_000 });
    await packToggle.waitFor({ state: 'visible', timeout: 15_000 });

    const settleMs = 1_000;
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      await packToggle.click();
      await new Promise((resolve) => {
        setTimeout(resolve, settleMs);
      });
      if (await packModeInput.isVisible()) {
        return;
      }
    }

    await packModeInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Select a pack from the flyout's `select-live-pack` combobox. Scoped to
   * `flyoutBody` so we don't cross-match a combobox elsewhere on the page.
   * The combobox is `asPlainText`, so the helper asserts on the rendered
   * label rather than the (replaced) input value. NOTE: the helper
   * deliberately does NOT press Escape — Escape bubbles up to the alert
   * flyout and closes it.
   */
  async selectFlyoutPack(packName: string): Promise<void> {
    const flyoutPackWrapper = this.flyoutBody.locator('[data-test-subj="select-live-pack"]');
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: flyoutPackWrapper },
      optionName: packName,
    });
  }

  async clickAddToCaseFromResults(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- the results panel renders an aggregate header "Add to Case" plus one per row; first-match targets the aggregate header action that drives the new-case flow (same semantics as the Cypress helper that preceded it)
    const addToCase = this.flyoutBody.getByRole('button', { name: 'Add to Case' }).first();
    // The aggregate header button only renders once `actionId` is set and the
    // PackResultsHeader mounts. On cold stacks the results panel can appear in
    // stages (loading cell → populated cell → header actions), so wait for the
    // button explicitly with a generous budget instead of relying on the
    // 10 s default click-actionability budget, which was racing against the
    // header-render after `waitForPackResults` returned.
    await addToCase.waitFor({ state: 'visible', timeout: 60_000 });
    await addToCase.click();
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
    await this.flyoutBody
      .getByText('All agents')
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {});
  }

  // See `common/submit_live_query.ts` for why a plain click-and-hope is not
  // reliable here (Monaco debounce race + EuiButton re-render + toast overlays).
  async clickSubmitInFlyout(): Promise<void> {
    await submitLiveQuery(this.page, this.submitButton, {
      // Fleet + "All agents" scheduling on Security flyouts can exceed the default
      // 10 s `waitForResponse` budget on serverless / cold CI (three misses burn
      // the whole 60 s budget with no successful POST).
      perAttemptTimeoutMs: 35_000,
      maxAttempts: 4,
      timeoutMs: 120_000,
    });
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
}
