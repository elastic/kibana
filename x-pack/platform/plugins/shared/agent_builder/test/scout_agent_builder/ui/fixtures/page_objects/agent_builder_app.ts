/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { subj } from '@kbn/test-subj-selector';
import {
  setupAgentCallSearchToolWithNoIndexSelectedThenAnswer,
  setupAgentDirectAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';

export class AgentBuilderApp {
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async navigateToApp(path: string = `agents/${agentBuilderDefaultAgentId}/conversations/new`) {
    await this.page.gotoApp(`agent_builder/${path}`);
    if (path.includes('conversations/new')) {
      await this.page.testSubj.locator('agentBuilderWelcomePage').waitFor({
        state: 'visible',
        timeout: 60_000,
      });
      return;
    }
    if (path === 'manage/agents') {
      await this.page.testSubj.locator('agentBuilderAgentsListContent').waitFor({
        state: 'visible',
        timeout: 60_000,
      });
      return;
    }
    if (path === 'manage/tools') {
      await this.page.testSubj.locator('agentBuilderToolsPage').waitFor({
        state: 'visible',
        timeout: 60_000,
      });
    }
  }

  async navigateToHome() {
    await this.page.gotoApp('home');
    const skipWelcome = this.page.testSubj.locator('skipWelcomeScreen');
    try {
      await skipWelcome.click({ timeout: 5_000 });
    } catch {
      // Home welcome overlay is not shown (e.g. already dismissed via localStorage).
    }
  }

  async typeMessage(message: string) {
    const input = this.page.testSubj.locator('agentBuilderConversationInputEditor');
    await input.click();
    await input.fill(message);
  }

  async sendMessage() {
    const sendButton = this.page.testSubj.locator('agentBuilderConversationInputSubmitButton');
    await sendButton.waitFor({ state: 'visible' });
    await sendButton.waitFor({ state: 'attached' });
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector(
          '[data-test-subj="agentBuilderConversationInputSubmitButton"]'
        ) as HTMLButtonElement | null;
        return el !== null && !el.disabled;
      },
      undefined,
      { timeout: 60_000 }
    );
    await sendButton.click();
  }

  async getCurrentConversationIdFromUrl(): Promise<string> {
    await this.page.waitForURL(/\/conversations\/[^/]+/);
    const url = this.page.url();
    const match = url.match(/\/conversations\/([^/?]+)/);
    if (!match) {
      throw new Error('Could not extract conversation ID from URL');
    }
    return match[1];
  }

  async createConversationViaUI(
    title: string,
    userMessage: string,
    expectedResponse: string,
    llmProxy: LlmProxy,
    withToolCall: boolean = false
  ): Promise<string> {
    await this.navigateToApp();
    await (withToolCall
      ? setupAgentCallSearchToolWithNoIndexSelectedThenAnswer({
          proxy: llmProxy,
          title,
          response: expectedResponse,
        })
      : setupAgentDirectAnswer({ proxy: llmProxy, title, response: expectedResponse }));
    await this.typeMessage(userMessage);
    await this.sendMessage();
    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    await this.page.waitForFunction(
      () => {
        const els = document.querySelectorAll('[data-test-subj="agentBuilderRoundResponse"]');
        if (els.length === 0) {
          return false;
        }
        const last = els[els.length - 1];
        return (last.textContent?.trim().length ?? 0) > 0;
      },
      undefined,
      { timeout: 120_000 }
    );
    await this.page.waitForFunction(
      () => !window.location.href.includes('/conversations/new'),
      undefined,
      { timeout: 120_000 }
    );
    return this.getCurrentConversationIdFromUrl();
  }

  async navigateToConversationViaHistory(conversationId: string) {
    await this.page.testSubj.click(`agentBuilderSidebarConversation-${conversationId}`);
  }

  async navigateToConversationById(conversationId: string) {
    await this.navigateToApp(
      `agents/${agentBuilderDefaultAgentId}/conversations/${conversationId}`
    );
  }

  async continueConversation(userMessage: string, expectedResponse: string, llmProxy: LlmProxy) {
    await setupAgentDirectAnswer({
      proxy: llmProxy,
      response: expectedResponse,
      continueConversation: true,
    });
    const existingCount = await this.page.testSubj.locator('agentBuilderRoundResponse').count();
    await this.typeMessage(userMessage);
    await this.sendMessage();
    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    await this.page.waitForFunction(
      (prev) => {
        const els = document.querySelectorAll('[data-test-subj="agentBuilderRoundResponse"]');
        return els.length > prev;
      },
      existingCount,
      { timeout: 120_000 }
    );
  }

  async deleteConversation(conversationId: string) {
    await this.page.testSubj.click(`agentBuilderSidebarConversation-${conversationId}`);
    await this.page.testSubj.click('agentBuilderConversationTitleButton');
    await this.page.testSubj.click('agentBuilderConversationDeleteButton');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.page.testSubj
      .locator(`agentBuilderSidebarConversation-${conversationId}`)
      .waitFor({ state: 'detached', timeout: 60_000 });
  }

  async isConversationInHistory(conversationId: string): Promise<boolean> {
    // the list query is invalidated and the row is unmounted. Avoids races where the
    // node is still attached but off-screen during sidebar re-render.
    const loc = this.page.testSubj.locator(`agentBuilderSidebarConversation-${conversationId}`);
    return (await loc.count()) > 0;
  }

  async clickThinkingToggle() {
    await this.page.testSubj.click('agentBuilderThinkingToggle');
  }

  async clickNewConversationButton() {
    await this.page.testSubj.click('agentBuilderSidebarNewConversationButton');
  }

  async getConversationTitle(): Promise<string> {
    const persisted = await this.page.testSubj
      .locator('agentBuilderConversationTitleButton')
      .count();
    const selector =
      persisted > 0 ? 'agentBuilderConversationTitleButton' : 'agentBuilderConversationTitle';
    return this.page.testSubj.locator(selector).innerText();
  }

  async renameConversation(newTitle: string): Promise<string> {
    await this.page.testSubj.click('agentBuilderConversationTitleButton');
    await this.page.testSubj.click('agentBuilderConversationRenameButton');
    const input = this.page.testSubj.locator('renameConversationModalInput');
    await input.click();
    await this.page.testSubj.clearInput('renameConversationModalInput');
    await input.fill(newTitle);
    await this.page.testSubj.click('renameConversationModalSave');
    await this.page.waitForFunction(
      (t) => {
        const btn = document.querySelector(
          '[data-test-subj="agentBuilderConversationTitleButton"]'
        );
        const h4 = document.querySelector('[data-test-subj="agentBuilderConversationTitle"]');
        const text = (btn ?? h4)?.textContent ?? '';
        return text.trim() === t;
      },
      newTitle,
      { timeout: 60_000 }
    );
    return newTitle;
  }

  async getThinkingDetails() {
    return this.page.testSubj.locator('agentBuilderThinkingPanel').innerText();
  }

  async clickRetryButton() {
    await this.page.testSubj.click('agentBuilderRoundErrorRetryButton');
  }

  async isErrorVisible() {
    return this.page.testSubj.locator('agentBuilderRoundError').isVisible();
  }

  async navigateToToolsLanding() {
    await this.navigateToApp('manage/tools');
  }

  async navigateToNewTool() {
    await this.navigateToApp('manage/tools/new');
  }

  async navigateToTool(toolId: string) {
    await this.navigateToApp(`manage/tools/${toolId}`);
  }

  async navigateToBulkImportMcp() {
    await this.navigateToApp('manage/tools/bulk_import_mcp');
  }

  async setToolId(toolId: string) {
    await this.page.testSubj.fill('agentBuilderToolIdInput', toolId);
  }

  async getToolIdValue() {
    const v = await this.page.testSubj.getAttribute('agentBuilderToolIdInput', 'value');
    return v ?? '';
  }

  async selectToolType(type: Exclude<ToolType, ToolType.builtin>) {
    await this.page.testSubj.click('agentBuilderToolTypeSelect');
    await this.page.testSubj.click(`agentBuilderToolTypeOption-${type}`);
  }

  async setToolDescription(description: string) {
    await this.page.testSubj
      .locator('agentBuilderToolFormPage')
      .locator('[data-test-subj="euiMarkdownEditorTextArea"]')
      .fill(description);
  }

  async getToolDescriptionValue(): Promise<string> {
    const ta = this.page.testSubj
      .locator('agentBuilderToolFormPage')
      .locator('[data-test-subj="euiMarkdownEditorTextArea"]');
    return (await ta.inputValue()).trim();
  }

  async setIndexPattern(indexPattern: string) {
    await this.page.testSubj.fill('agentBuilderIndexPatternInput', indexPattern);
  }

  async setEsqlQuery(query: string) {
    await this.codeEditor.setCodeEditorValue(query);
    const editor = this.page.testSubj.locator('agentBuilderEsqlEditor');
    await editor.click();
    await this.page.keyboard.press('Tab');
  }

  async selectMcpConnector(connectorId: string) {
    await this.page.testSubj.click('agentBuilderMcpConnectorSelect');
    await this.page.testSubj.click(`mcpConnectorOption-${connectorId}`);
  }

  async selectMcpTool(toolName: string) {
    const optionSubj = `mcpToolOption-${toolName}`;
    const option = this.page.locator(`[data-test-subj="${optionSubj}"]`);
    // Retry clicking the combobox until the option appears. A single click can
    // either open or close the EuiComboBox dropdown, so we guard against
    // accidentally toggling it closed by only clicking when the option isn't
    // already visible.
    await expect(async () => {
      if (!(await option.isVisible())) {
        await this.page.testSubj.click('agentBuilderMcpToolSelect');
      }
      await expect(option).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await option.click();
  }

  async waitForMcpToolsToLoad() {
    // EuiComboBox renders an <input> inside the wrapper that carries the
    // data-test-subj. While MCP tools are loading or the combobox is disabled,
    // that input has the `disabled` attribute set. Wait until it's cleared.
    await this.page.waitForFunction(
      () => {
        const wrapper = document.querySelector('[data-test-subj="agentBuilderMcpToolSelect"]');
        const input = wrapper?.querySelector('input') as HTMLInputElement | null;
        return input !== null && !input.disabled;
      },
      undefined,
      { timeout: 60_000 }
    );
  }

  async openManageMcpMenu() {
    await this.page.testSubj.click('agentBuilderManageMcpButton');
  }

  async clickBulkImportMcpMenuItem() {
    await this.page.testSubj
      .locator('agentBuilderBulkImportMcpMenuItem')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.click('agentBuilderBulkImportMcpMenuItem');
  }

  async selectBulkImportConnector(connectorId: string) {
    await this.page.testSubj.click('bulkImportMcpConnectorSelect');
    await this.page.testSubj.click(`bulkImportMcpConnectorOption-${connectorId}`);
  }

  async waitForBulkImportToolsToLoad() {
    await this.page.waitForFunction(() => {
      const table = document.querySelector(
        '[data-test-subj="bulkImportMcpToolsTable"]'
      ) as HTMLElement | null;
      return table !== null && table.getAttribute('data-is-loading') !== 'true';
    });
  }

  async selectBulkImportToolCheckbox(toolName: string) {
    await this.page.testSubj.click(`checkboxSelectRow-${toolName}`);
  }

  async setBulkImportNamespace(namespace: string) {
    await this.page.testSubj.fill('bulkImportMcpToolsNamespaceInput', namespace);
  }

  async clickBulkImportSubmit() {
    await this.page.testSubj.click('bulkImportMcpToolsImportButton');
  }

  async saveTool(closeToast: boolean = true) {
    await this.page.testSubj.click('toolFormSaveButton');
    if (closeToast) {
      await this.page.testSubj.click('toastCloseButton');
    }
  }

  async openToolContextMenu() {
    await this.page.testSubj.click('agentBuilderToolContextMenuButton');
  }

  async clickToolCloneButton() {
    await this.page.testSubj.click('agentBuilderToolCloneButton');
  }

  async clickToolDeleteButton() {
    await this.page.testSubj.click('agentBuilderToolDeleteButton');
  }

  async confirmModalConfirm() {
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  async selectToolRowCheckbox(toolId: string) {
    await this.page.testSubj.click(`checkboxSelectRow-${toolId}`);
  }

  async clickToolsSelectAll() {
    await this.page.testSubj.click('agentBuilderToolsSelectAllButton');
  }

  async clickToolsBulkDelete() {
    await this.page.testSubj.click('agentBuilderToolsBulkDeleteButton');
  }

  async openToolTestFlyout() {
    await this.page.testSubj.click('toolFormTestButton');
  }

  async submitToolTest() {
    await this.page.testSubj.click('agentBuilderToolTestSubmitButton');
  }

  async waitForToolTestResponseNotEmpty() {
    await this.page.waitForFunction(() => {
      const el = document.querySelector('[data-test-subj="agentBuilderToolTestResponse"]');
      const text = el?.textContent ?? '';
      return text.length > 0 && !text.includes('{}');
    });
  }

  async setToolTestInput(paramName: string, value: string | number) {
    await this.page.testSubj.fill(`agentBuilderToolTestInput-${paramName}`, String(value));
  }

  async getToolTestResponse(): Promise<string> {
    return this.page.testSubj.locator('agentBuilderToolTestResponse').innerText();
  }

  async isToolInTable(toolId: string): Promise<boolean> {
    await this.toolsSearch().type(toolId);
    try {
      await this.page.testSubj.locator(`agentBuilderToolsTableRow-${toolId}`).waitFor({
        state: 'visible',
        timeout: 15_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async bulkDeleteTools(ids?: string[]) {
    if (ids && ids.length > 0) {
      for (const id of ids) {
        await this.selectToolRowCheckbox(id);
      }
    } else {
      await this.clickToolsSelectAll();
    }
    await this.clickToolsBulkDelete();
    await this.confirmModalConfirm();
    await this.page.testSubj.click('toastCloseButton');
  }

  toolsSearch() {
    return {
      type: async (term: string) => {
        const search = this.page.testSubj.locator('agentBuilderToolsSearchInput');
        await search.click();
        await search.clear();
        await search.pressSequentially(term, { delay: 15 });
      },
    };
  }

  async createAgentViaUI(agent: { id: string; name: string; labels: string[] }) {
    await this.navigateToApp('manage/agents/new');
    await this.page.testSubj.fill('agentSettingsIdInput', agent.id);
    await this.page.testSubj.fill('agentSettingsDisplayNameInput', agent.name);
    await this.page.testSubj.fill('agentSettingsDescriptionInput', `Agent for testing ${agent.id}`);
    const labelsCombo = this.page.testSubj.locator('agentSettingsLabelsComboBox');
    const labelsInput = labelsCombo.getByTestId('comboBoxSearchInput');
    for (const label of agent.labels) {
      await labelsInput.click();
      await labelsInput.fill(label);
      await this.page.keyboard.press('Enter');
    }
    await this.page.testSubj.click('agentFormSaveButton');
    await this.page.testSubj
      .locator('agentBuilderAgentsListPageTitle')
      .waitFor({ state: 'visible' });
  }

  agentsListSearch() {
    const contentSelector = subj('agentBuilderAgentsListContent');
    const searchSelector = `${contentSelector} .euiFieldSearch`;
    const clearButtonSelector = `${contentSelector} ${subj('clearSearchButton')}`;
    return {
      type: async (term: string) => {
        const search = this.page.locator(searchSelector);
        await search.click();
        await search.clear();
        // EuiInMemoryTable uses incremental search; fill() does not reliably fire per-keystroke filtering.
        await search.pressSequentially(term, { delay: 15 });
      },
      clear: async () => {
        await this.page.locator(clearButtonSelector).click();
      },
      getValue: async () => this.page.locator(searchSelector).getAttribute('value'),
    };
  }

  async selectAgentLabel(label: string) {
    const contentSelector = subj('agentBuilderAgentsListContent');
    const labelsButtonSelector = `${contentSelector} button[type="button"][aria-label="Labels Selection"]`;
    const optionSelector = `ul[role="listbox"][aria-label="Labels"] > li[role="option"][title="${label}"]`;
    await this.page.locator(labelsButtonSelector).click();
    await this.page.locator(optionSelector).click();
  }

  async countAgentsListRows() {
    return this.page.testSubj.locator('^agentBuilderAgentsListRow').count();
  }

  private agentListRowSelector(agentId: string) {
    return `agentBuilderAgentsListRow-${agentId}`;
  }

  async agentExistsOrFail(agentId: string) {
    await this.page.testSubj
      .locator(this.agentListRowSelector(agentId))
      .waitFor({ state: 'visible' });
  }

  async agentMissingOrFail(agentId: string) {
    await this.page.testSubj
      .locator(this.agentListRowSelector(agentId))
      .waitFor({ state: 'detached', timeout: 60_000 });
  }

  agentAction(agentId: string, actionSubj: string) {
    const row = this.page.testSubj.locator(this.agentListRowSelector(agentId));
    const actionInPortal = this.page.locator(`[data-euiportal="true"] ${subj(actionSubj)}`);
    return {
      click: async () => {
        await row.getByTestId('euiCollapsedItemActionsButton').click();
        await actionInPortal.click();
      },
      getHref: async () => {
        await row.getByTestId('euiCollapsedItemActionsButton').click();
        return actionInPortal.getAttribute('href');
      },
    };
  }

  async getAgentRowDisplayName(agentId: string) {
    const row = this.page.testSubj.locator(this.agentListRowSelector(agentId));
    return row
      .getByTestId('agentBuilderAgentsListNameAndDescription')
      .getByTestId('agentBuilderAgentsListName')
      .innerText();
  }

  async getAgentLabels(agentId: string) {
    const row = this.page.testSubj.locator(this.agentListRowSelector(agentId));
    const labelsCell = row.getByTestId('agentBuilderAgentsListLabels');
    const labelTexts = await labelsCell.locator(subj('^agentBuilderLabel-')).allInnerTexts();
    const viewMore = labelsCell.getByTestId('agentBuilderLabelsViewMoreButton');
    if (await viewMore.isVisible()) {
      await viewMore.click();
      const popover = this.page.testSubj.locator('agentBuilderLabelsViewMorePopover');
      const hidden = await popover.locator(subj('^agentBuilderLabel-')).allInnerTexts();
      labelTexts.push(...hidden);
      await viewMore.click();
    }
    return labelTexts;
  }

  async clickAgentChat(agentId: string) {
    await this.agentAction(agentId, `agentBuilderAgentsListChat-${agentId}`).click();
  }

  async clickAgentEdit(agentId: string) {
    await this.agentAction(agentId, `agentBuilderAgentsListEdit-${agentId}`).click();
  }

  async hasAgentEditLink(agentId: string) {
    const href = await this.agentAction(agentId, `agentBuilderAgentsListEdit-${agentId}`).getHref();
    return Boolean(href?.includes(`/agents/${agentId}`));
  }

  async clickAgentClone(agentId: string) {
    await this.agentAction(agentId, `agentBuilderAgentsListClone-${agentId}`).click();
  }

  async hasAgentCloneLink(agentId: string) {
    const href = await this.agentAction(
      agentId,
      `agentBuilderAgentsListClone-${agentId}`
    ).getHref();
    return Boolean(href?.includes(`/agents/new?source_id=${agentId}`));
  }

  async openAgentDeleteModal(agentId: string) {
    const deleteActionSelector = `agentBuilderAgentsListDelete-${agentId}`;
    await this.agentAction(agentId, deleteActionSelector).click();
    const modal = this.page.locator(
      '.euiModal[role="alertdialog"][aria-labelledby^="agentDeleteModalTitle"]'
    );
    return {
      getTitle: async () => {
        const title = modal.locator('[id^="agentDeleteModalTitle"]');
        return title.innerText();
      },
      clickConfirm: async () => {
        await modal.getByTestId('agentBuilderAgentDeleteConfirmButton').click();
      },
    };
  }

  async getAgentFormPageTitle() {
    return this.page.testSubj.locator('agentFormPageTitle').innerText();
  }

  getAgentIdInput() {
    const idInputSelector = 'agentSettingsIdInput';
    return {
      getValue: async () => this.page.testSubj.getAttribute(idInputSelector, 'value'),
      isEnabled: async () => this.page.testSubj.locator(idInputSelector).isEnabled(),
    };
  }

  async getAgentFormDisplayName() {
    const v = await this.page.testSubj.getAttribute('agentSettingsDisplayNameInput', 'value');
    return v ?? '';
  }

  async setAgentFormDisplayName(name: string) {
    await this.page.testSubj.fill('agentSettingsDisplayNameInput', name);
  }

  agentFormSaveButton() {
    const saveButtonSelector = 'agentFormSaveButton';
    return {
      isEnabled: async () => this.page.testSubj.locator(saveButtonSelector).isEnabled(),
      click: async () => {
        await this.page.testSubj.click(saveButtonSelector);
        await this.page.testSubj
          .locator('agentBuilderAgentsListPageTitle')
          .waitFor({ state: 'visible' });
      },
    };
  }

  async prepareEmbeddableSidebar() {
    await this.navigateToHome();
    await this.openEmbeddableSidebar();
    await this.waitForEmbeddableSidebarOpen();
  }

  async prepareEmbeddableSidebarWithNewChat() {
    await this.prepareEmbeddableSidebar();
    await this.openEmbeddableMenu();
    await this.clickEmbeddableNewChatButton();
  }

  async openEmbeddableSidebar() {
    await this.page.testSubj.click('AgentBuilderNavControlButton');
  }

  async waitForEmbeddableSidebarOpen() {
    await this.page.testSubj
      .locator('agentBuilderEmbeddableMenuButton')
      .waitFor({ state: 'visible' });
  }

  async openEmbeddableMenu() {
    await this.page.testSubj.click('agentBuilderEmbeddableMenuButton');
  }

  async clickEmbeddableNewChatButton() {
    await this.page.testSubj.click('agentBuilderEmbeddableNewChatButton');
  }

  async selectEmbeddableConversation(conversationId: string) {
    await this.page.testSubj.click(`agentBuilderEmbeddableConversation-${conversationId}`);
  }

  async clickEmbeddableAgentRow() {
    await this.page.testSubj.click('agentBuilderEmbeddableAgentRow');
  }

  async selectEmbeddableAgent(agentId: string) {
    await this.page.testSubj.click(`agentBuilderAgentOption-${agentId}`);
  }

  async dismissWithEscape() {
    await this.page.keyboard.press('Escape');
  }

  async fillEmbeddableConversationSearch(text: string) {
    const input = this.page.testSubj.locator('agentBuilderEmbeddableConversationSearch');
    await input.click();
    await input.fill(text);
  }

  async clearEmbeddableConversationSearch() {
    const input = this.page.testSubj.locator('agentBuilderEmbeddableConversationSearch');
    await input.clear();
  }
}
