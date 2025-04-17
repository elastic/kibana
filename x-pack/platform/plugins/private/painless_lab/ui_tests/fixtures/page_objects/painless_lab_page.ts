/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator } from '@kbn/scout';
import { ScoutPage } from '@kbn/scout/src/playwright';

export class PainlessLab {
  public outputValueElement: Locator;
  public requestFlyoutHeader: Locator;
  public viewRequestButton: Locator;
  public flyoutResponseTab: Locator;

  constructor(private readonly page: ScoutPage) {
    this.outputValueElement = this.page.testSubj.locator('painlessTabs');
    this.requestFlyoutHeader = this.page.testSubj.locator('painlessLabRequestFlyoutHeader');
    this.viewRequestButton = this.page.testSubj.locator('btnViewRequest');
    this.flyoutResponseTab = this.page.locator('#response');
  }

  async goto() {
    return this.page.gotoApp('dev_tools', { hash: 'painless_lab' });
  }

  async waitForRenderComplete() {
    // wait for page to be rendered
    await this.page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
    await this.page.testSubj.locator('painlessTabs-loaded').waitFor({ state: 'visible' });
  }

  async setCodeEditorValue(value: any, nthIndex?: any) {
    await this.page.evaluate(
      ([editorIndex, codeEditorValue]) => {
        const editor = window.MonacoEnvironment!.monaco!.editor;
        const textModels = editor.getModels();

        if (editorIndex !== undefined) {
          textModels[editorIndex].setValue(codeEditorValue);
        } else {
          textModels.forEach((model) => model.setValue(codeEditorValue));
        }
      },
      [nthIndex, value]
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
