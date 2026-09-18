/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

const TEMPLATE_EDITOR_TEST_SUBJ = 'customContentTemplateEditorContainer';

export class CustomContentPanelPage {
  readonly addCustomPanelAction: Locator;
  readonly createFlyoutTitle: Locator;
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
    this.createFlyoutTitle = page.testSubj.locator('customContentCreateFlyoutTitle');
    this.editFlyoutTitle = page.testSubj.locator('customContentEditFlyoutTitle');
    this.templateEditorContainer = page.testSubj.locator(TEMPLATE_EDITOR_TEST_SUBJ);
    this.esqlAccordionButton = page.testSubj
      .locator('customContentEsqlSection')
      .getByRole('button', { name: /Data source/ });
    this.applyButton = page.testSubj.locator('customContentApplyButton');
    this.cancelButton = page.testSubj.locator('customContentCancelButton');
    this.runPreviewButton = page.testSubj.locator('customContentRunPreviewButton');
    this.panel = page.testSubj.locator('customContentPanel');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async openFromAddPanelFlyout() {
    await this.addCustomPanelAction.click();
  }

  async setTemplate(template: string) {
    await this.codeEditor.waitCodeEditorReady(TEMPLATE_EDITOR_TEST_SUBJ);
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
