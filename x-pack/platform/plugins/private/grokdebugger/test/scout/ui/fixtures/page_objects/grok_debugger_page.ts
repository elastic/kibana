/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

interface MonacoModel {
  setValue: (value: string) => void;
}

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: {
      editor?: {
        getModels: () => MonacoModel[];
      };
    };
  };
}

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
    await this.waitForEditorModel(index);
    await this.page.evaluate(
      ({ editorIndex, editorValue }) => {
        const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
        if (!editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const model = editor.getModels()[editorIndex];
        if (!model) {
          throw new Error(`Monaco model ${editorIndex} is not available`);
        }
        model.setValue(editorValue);
      },
      { editorIndex: index, editorValue: value }
    );
  }

  private async waitForEditorModel(index: number) {
    await expect
      .poll(async () =>
        this.page.evaluate(() => {
          const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
          return editor?.getModels().length ?? 0;
        })
      )
      .toBeGreaterThan(index);
  }

  private async getStructuredOutput(): Promise<Record<string, string>> {
    const outputText = await this.output.innerText();
    return JSON.parse(outputText) as Record<string, string>;
  }
}
