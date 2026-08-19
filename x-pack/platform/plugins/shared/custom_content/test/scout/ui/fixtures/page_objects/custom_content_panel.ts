/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export class CustomContentPanelPage {
  readonly addCustomPanelAction: Locator;
  readonly flyoutTitle: Locator;
  readonly editFlyoutTitle: Locator;
  readonly templateEditorContainer: Locator;
  readonly esqlAccordionButton: Locator;
  readonly applyButton: Locator;
  readonly cancelButton: Locator;
  readonly runPreviewButton: Locator;
  readonly panel: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(page: ScoutPage) {
    this.addCustomPanelAction = page.testSubj.locator('create-action-Custom');
    this.flyoutTitle = page.locator('h2', { hasText: 'Create custom panel' });
    this.editFlyoutTitle = page.locator('h2', { hasText: 'Edit custom panel' });
    this.templateEditorContainer = page.testSubj.locator('customContentTemplateEditorContainer');
    this.esqlAccordionButton = page.testSubj
      .locator('customContentEsqlSection')
      .getByRole('button', { name: /Data source/ });
    this.applyButton = page.testSubj.locator('customContentFlyoutApplyButton');
    this.cancelButton = page.testSubj.locator('customContentFlyoutCancelButton');
    this.runPreviewButton = page.testSubj.locator('customContentFlyoutRunPreviewButton');
    this.panel = page.testSubj.locator('customContentPanel');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async openFromAddPanelFlyout() {
    await this.addCustomPanelAction.click();
  }

  async setTemplate(template: string) {
    await this.codeEditor.waitCodeEditorReady('customContentTemplateEditorContainer');
    await this.codeEditor.setCodeEditorValue(template, 0);
  }

  async setEsqlQuery(query: string) {
    await this.esqlAccordionButton.click();
    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
    await this.codeEditor.setCodeEditorValue(query, 1);
  }

  async runPreview() {
    await this.runPreviewButton.click();
  }

  async applyAndClose() {
    await this.applyButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  getPanelIframe() {
    return this.panel.frameLocator('iframe');
  }
}
