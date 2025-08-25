/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class PainlessLab {
  public editorOutputPane: Locator;
  public requestFlyoutHeader: Locator;
  public viewRequestButton: Locator;
  public flyoutResponseTab: Locator;

  constructor(private readonly page: ScoutPage) {
    this.editorOutputPane = this.page.testSubj.locator('painlessTabs-loaded');
    this.requestFlyoutHeader = this.page.testSubj.locator('painlessLabRequestFlyoutHeader');
    this.viewRequestButton = this.page.testSubj.locator('btnViewRequest');
    this.flyoutResponseTab = this.page.locator('#response');
  }

  async goto() {
    return this.page.gotoApp('dev_tools', { hash: 'painless_lab' });
  }

  async waitForEditorToLoad() {
    // wait for page to be rendered
    await this.page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
    await this.editorOutputPane.waitFor({ state: 'visible' });
  }

  async setCodeEditorValue(value: string, nthIndex?: number): Promise<void> {
    await this.page.evaluate(
      ({ editorIndex, codeEditorValue }) => {
        const editor = window.MonacoEnvironment!.monaco!.editor;
        const textModels = editor.getModels();

        if (editorIndex !== undefined) {
          textModels[editorIndex].setValue(codeEditorValue);
        } else {
          textModels.forEach((model) => model.setValue(codeEditorValue));
        }
      },
      { editorIndex: nthIndex, codeEditorValue: value }
    );
  }

  async getFlyoutRequestBody() {
    return this.page.testSubj.locator('painlessLabFlyoutRequest').innerText();
  }

  async getFlyoutResponseBody() {
    const flyoutResponse = this.page.testSubj.locator('painlessLabFlyoutResponse');
    await flyoutResponse.waitFor({ state: 'visible' });
    return flyoutResponse.innerText();
  }
}
