/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

const CANVAS_ARIA_LABEL = 'Attachment preview';
const RENDER_ERROR_TITLE = "Couldn't render this attachment";

/** Drives the Agent Builder chat and the attachment canvas that alerting attachments render into. */
export class AgentChatPage {
  /** The attachment canvas flyout opened from an inline attachment card. */
  public readonly canvas: Locator;
  /** Callout the Agent Builder error boundary shows when an attachment renderer throws. */
  public readonly renderErrorCallout: Locator;
  public readonly responseMessage: Locator;
  /** The Preview button on the inline attachment card in the agent's response. */
  public readonly previewButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.canvas = this.page.locator(`[aria-label="${CANVAS_ARIA_LABEL}"]`);
    this.renderErrorCallout = this.page.getByText(RENDER_ERROR_TITLE);
    this.responseMessage = this.page.testSubj.locator('agentBuilderResponseMessage');
    this.previewButton = this.responseMessage.getByRole('button', { name: 'Preview', exact: true });
  }

  async goto() {
    await this.page.gotoApp(`agent_builder/agents/${agentBuilderDefaultAgentId}/conversations/new`);
    await this.page.testSubj.locator('agentBuilderWelcomePage').waitFor({
      state: 'visible',
      timeout: 60_000,
    });
  }

  async sendMessage(message: string) {
    const input = this.page.testSubj.locator('agentBuilderConversationInputEditor');
    await input.click();
    await input.fill(message);
    const submitButton = this.page.testSubj.locator('agentBuilderConversationInputSubmitButton');
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
  }

  async openAttachmentCanvas() {
    await this.previewButton.click();
    await this.canvas.waitFor({ state: 'visible' });
  }

  async closeAttachmentCanvas() {
    await this.canvas.getByRole('button', { name: 'Close', exact: true }).click();
    await this.canvas.waitFor({ state: 'hidden' });
  }

  /** A header action button in the canvas, such as "Create rule" or "Update Rule". */
  canvasAction(label: string): Locator {
    return this.canvas.getByRole('button', { name: label, exact: true });
  }

  /**
   * An overflow action, such as "View in Rules", which the canvas header keeps behind the
   * "More actions" menu. The menu renders in a portal, outside the flyout.
   */
  async openCanvasOverflowAction(label: string) {
    await this.canvas.getByRole('button', { name: 'More actions', exact: true }).click();
    const action = this.page.getByRole('menuitem', { name: label });
    await action.waitFor({ state: 'visible' });
    return action;
  }

  canvasSection(testSubj: string): Locator {
    return this.canvas.locator(`[data-test-subj="${testSubj}"]`);
  }

  /** A field inside the inline attachment card in the agent's response. */
  inlineSection(testSubj: string): Locator {
    return this.responseMessage.locator(`[data-test-subj="${testSubj}"]`);
  }

  /** Opens a canvas accordion, such as Artifacts, when it is collapsed. */
  async expandCanvasSection(title: string) {
    const toggle = this.canvas.getByRole('button', { name: title, exact: true });
    const collapsed = toggle.and(this.page.locator('[aria-expanded="false"]'));
    if (await collapsed.isVisible()) {
      await toggle.click();
    }
    await toggle.and(this.page.locator('[aria-expanded="true"]')).waitFor({ state: 'visible' });
  }
}
