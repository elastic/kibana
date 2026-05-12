/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class GrokDebuggerPage {
  readonly container: Locator;
  readonly simulateButton: Locator;
  readonly output: Locator;
  readonly customPatternsToggle: Locator;

  constructor(private readonly page: ScoutPage) {
    this.container = this.page.testSubj.locator('grokDebuggerContainer');
    this.simulateButton = this.page.testSubj.locator('btnSimulate');
    this.output = this.page.testSubj.locator('eventOutputCodeBlock');
    this.customPatternsToggle = this.page.testSubj.locator('btnToggleCustomPatternsInput');
  }

  async goto() {
    await this.page.gotoApp('dev_tools', { hash: 'grokdebugger' });
    await this.container.waitFor();
  }

  async setEventInput(value: string) {
    await this.setEditorValue(0, value);
  }

  async setPatternInput(value: string) {
    await this.setEditorValue(1, value);
  }

  async setCustomPatternInput(value: string) {
    await this.customPatternsToggle.waitFor();
    await this.customPatternsToggle.click();
    await this.setEditorValue(2, value);
  }

  async executeSimulation(input: string, pattern: string, customPattern?: string) {
    await this.setEventInput(input);
    await this.setPatternInput(pattern);
    if (customPattern) {
      await this.setCustomPatternInput(customPattern);
    }

    await this.simulateButton.click();
    await expect.poll(() => this.getStructuredOutput()).not.toStrictEqual({});

    return await this.getStructuredOutput();
  }

  private async setEditorValue(index: number, value: string) {
    await this.page.evaluate(
      ({ editorIndex, editorValue }) => {
        window.MonacoEnvironment!.monaco!.editor.getModels()[editorIndex].setValue(editorValue);
      },
      { editorIndex: index, editorValue: value }
    );
  }

  private async getStructuredOutput(): Promise<Record<string, string>> {
    const outputText = await this.output.innerText();
    return JSON.parse(outputText) as Record<string, string>;
  }
}
