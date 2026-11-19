/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export class MlJobWizard {
  readonly advancedJobWizardPage: Locator;
  readonly datafeedQueryEditorHint: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.advancedJobWizardPage = this.page.locator(
      '[data-test-subj~="mlPageJobWizard"][data-test-subj~="advanced"]'
    );
    this.datafeedQueryEditorHint = this.page.locator(
      '[data-test-subj="mlAdvancedDatafeedQueryEditor"] [data-test-subj~="codeEditorHint"]'
    );
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async waitForAdvancedJobWizardOpen(): Promise<void> {
    await this.advancedJobWizardPage.waitFor({ state: 'visible' });
  }

  async waitForDatafeedQueryEditor(): Promise<void> {
    await this.codeEditor.waitCodeEditorReady('mlAdvancedDatafeedQueryEditor');
    await this.datafeedQueryEditorHint.waitFor({ state: 'visible' });
  }

  async getDatafeedQueryEditorValue(): Promise<string> {
    return this.codeEditor.getCodeEditorValue();
  }
}
