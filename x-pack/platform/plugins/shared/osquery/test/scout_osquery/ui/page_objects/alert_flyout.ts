/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { MONACO_TO_RHF_SETTLE_MS } from '../../common/constants';
import { submitLiveQuery } from '../../common/submit_live_query';
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
    // Multiple osquery flyout roots (alert/timeline/portals); use last visible match.
    this.flyoutBody = this.page
      .getByTestId(FLYOUT_OSQUERY_EDITOR)
      .filter({ visible: true })
      // eslint-disable-next-line playwright/no-nth-methods -- active flyout = last visible root
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
    // Scope agent combobox to visible flyout (page-wide match hits hidden shells).
    this.agentSelection = this.flyoutBody.getByTestId('agentSelection');
    this.timelineModalHeader = this.page.testSubj.locator('timeline-modal-header-panel');
    this.timelineExpandEventToggle = this.page.testSubj.locator('docTableExpandToggleColumn');
  }

  // Send alert to timeline, then expand first row: move mouse off tooltip (blocks toggle); wait for timeline header before expand (avoids detached-node races).
  async openFirstAlertInTimelineAndExpand(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- top alert row
    await this.sendAlertToTimelineButton.first().click();
    await this.timelineModalHeader.waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.mouse.move(0, 0);
    // eslint-disable-next-line playwright/no-nth-methods -- first event row expand
    const firstExpandToggle = this.timelineExpandEventToggle.first();
    await firstExpandToggle.waitFor({ state: 'visible', timeout: 30_000 });
    await firstExpandToggle.click();
  }

  async expandFirstAlert(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- first alert on filtered view
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

  // Blur editor, then brief settle so debounced onChange can flush into RHF before Submit.
  async inputFlyoutQuery(query: string): Promise<void> {
    await this.waitForFlyoutEditorReady();
    await this.flyoutOsqueryEditor.click();
    await this.flyoutOsqueryEditor.pressSequentially(query, { delay: 5 });

    // Blur hidden textarea (Tab/Enter would insert into editor).
    await this.flyoutOsqueryEditor.evaluate((el: HTMLElement) => {
      el.querySelector<HTMLTextAreaElement>('textarea')?.blur();
    });

    // Editor debounces onChange at 500ms (`public/editor/index.tsx`); give RHF time after typing.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, MONACO_TO_RHF_SETTLE_MS);
    });
  }

  async waitForFlyoutEditorReady(): Promise<void> {
    // Race: "N agents selected" (take-action path) vs editor visible (IG path); then ensure editor.
    await Promise.race([
      this.page.getByText(/\d+ agents? selected/).waitFor({ state: 'visible', timeout: 60_000 }),
      this.flyoutOsqueryEditor.waitFor({ state: 'visible', timeout: 60_000 }),
    ]);
    await this.flyoutOsqueryEditor.waitFor({ state: 'visible', timeout: 60_000 });
  }

  // Toggle pack card switch until pack combobox stays mounted (click switch, not card body).
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

  /** Pack combobox in flyout only; plain-text option helper; no Escape (closes flyout). */
  async selectFlyoutPack(packName: string): Promise<void> {
    const flyoutPackWrapper = this.flyoutBody.locator('[data-test-subj="select-live-pack"]');
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: flyoutPackWrapper },
      optionName: packName,
    });
  }

  async clickAddToCaseFromResults(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- header "Add to Case" before per-row buttons
    const addToCase = this.flyoutBody.getByRole('button', { name: 'Add to Case' }).first();
    // Header mounts after results/actionId; cold stacks need explicit wait before click.
    await addToCase.waitFor({ state: 'visible', timeout: 60_000 });
    await addToCase.click();
  }

  async clearAgentsAndSelectAllAgents(): Promise<void> {
    await this.agentSelection.getByTestId('comboBoxClearButton').click();
    // Type into inner search input (wrapper is not fillable).
    const input = this.agentSelection.getByTestId('comboBoxSearchInput');
    await input.click();
    await input.fill('All');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    // No Escape — it closes the alert flyout.
    await this.flyoutBody
      .getByText('All agents')
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {});
  }

  /**
   * Replace any existing agent selection with one or more named mocked agents.
   *
   * Tier-A specs MUST use this instead of `clearAgentsAndSelectAllAgents` —
   * the "All agents" path sends `agent_all: true` to `POST /api/osquery/live_queries`,
   * which triggers Fleet's `agentService.listAgents()` query against the
   * `.fleet-agents` index server-side. That index does not exist in Tier-A
   * (no Fleet Server), so the POST 500s with `index_not_found_exception`.
   * Selecting specific agent(s) fills `agent_ids: [...]` instead and bypasses
   * the Fleet listAgents call entirely.
   *
   * Multi-agent selection is supported — the picker accumulates picks.
   */
  async clearAgentsAndSelectMockedAgents(hostnames: string | string[]): Promise<void> {
    const names = Array.isArray(hostnames) ? hostnames : [hostnames];

    // Clear may be missing if no chip is currently selected — tolerate.
    await this.agentSelection
      .getByTestId('comboBoxClearButton')
      .click({ timeout: 5_000 })
      .catch(() => {});

    const input = this.agentSelection.getByTestId('comboBoxSearchInput');
    for (const hostname of names) {
      await input.click();
      await input.fill(hostname);
      const option = this.page.getByRole('option', { name: new RegExp(hostname) });
      await option.waitFor({ state: 'visible', timeout: 30_000 });
      await option.click();
      // Selected pill renders the hostname inside the flyout's agentSelection subtree.
      await this.agentSelection.getByText(hostname).waitFor({
        state: 'visible',
        timeout: 15_000,
      });
    }
  }

  /**
   * Submit and return the captured action ids:
   * - `actionId`: top-level umbrella id (use for `waitForLiveQueryComplete` / cases drill-down).
   * - `queryActionIds`: per-query ids for seeding `indexActionResponses` / `indexResultRows` (results UI filters by these).
   *
   * Single-query alert flyout submissions emit exactly one `queryActionIds` entry.
   * See `common/submit_live_query.ts` for the rationale.
   */
  async clickSubmitInFlyout(): Promise<{ actionId?: string; queryActionIds: string[] }> {
    const { actionId, queryActionIds } = await submitLiveQuery(this.page, this.submitButton, {
      responseTimeoutMs: 120_000,
    });

    return { actionId, queryActionIds };
  }

  async clickAddToTimeline(): Promise<void> {
    await this.page
      .getByText('Add to Timeline investigation')
      .waitFor({ state: 'visible', timeout: 180_000 });
    // eslint-disable-next-line playwright/no-nth-methods -- first add-to-timeline in results
    await this.addToTimelineButton.first().click();
  }

  async clickCancelInFlyout(): Promise<void> {
    await this.cancelButton.click();
  }
}
