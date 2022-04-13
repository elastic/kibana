/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class MonacoEditorService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async waitCodeEditorReady(containerTestSubjId: string) {
    const editorContainer = await this.testSubjects.find(containerTestSubjId);
    await editorContainer.findByCssSelector('textarea');
  }

  public async getCodeEditorValue(nthIndex: number = 0) {
    let values: string[] = [];

    await this.retry.try(async () => {
      values = await this.browser.execute(
        () =>
          (window as any).MonacoEnvironment.monaco.editor
            .getModels()
            .map((model: any) => model.getValue()) as string[]
      );
    });

    return values[nthIndex] as string;
  }

  public async typeCodeEditorValue(value: string, testSubjId: string) {
    const editor = await this.testSubjects.find(testSubjId);
    const textarea = await editor.findByCssSelector('textarea');
    await textarea.type(value);
  }

  public async setCodeEditorValue(value: string, nthIndex = 0) {
    await this.retry.try(async () => {
      await this.browser.execute(
        (editorIndex, codeEditorValue) => {
          const editor = (window as any).MonacoEnvironment.monaco.editor;
          const instance = editor.getModels()[editorIndex];
          instance.setValue(codeEditorValue);
        },
        nthIndex,
        value
      );
    });
  }
}
