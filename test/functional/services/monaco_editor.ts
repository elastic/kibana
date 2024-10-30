/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type monaco } from '@kbn/monaco';
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class MonacoEditorService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly findService = this.ctx.getService('find');

  public async waitCodeEditorReady(containerTestSubjId: string) {
    const editorContainer = await this.testSubjects.find(containerTestSubjId);
    await editorContainer.findByCssSelector('textarea');
  }

  public async getCodeEditorValue(nthIndex: number = 0) {
    let values: string[] = [];

    await this.retry.try(async () => {
      values = await this.browser.execute(
        () =>
          // @ts-expect-error this value is provided in @kbn/monaco for this specific purpose, see {@link packages/kbn-monaco/src/register_globals.ts}
          (window.MonacoEnvironment?.monaco.editor as typeof monaco.editor)
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

  public async setCodeEditorValue(value: string, nthIndex?: number) {
    await this.retry.try(async () => {
      await this.browser.execute(
        (editorIndex, codeEditorValue) => {
          // @ts-expect-error this value is provided in @kbn/monaco for this specific purpose, see {@link packages/kbn-monaco/src/register_globals.ts}
          const editor = window.MonacoEnvironment?.monaco.editor as typeof monaco.editor;
          const textModels = editor.getModels();

          if (editorIndex) {
            textModels[editorIndex].setValue(codeEditorValue);
          } else {
            // when specific model instance is unknown, update all models returned
            textModels.forEach((model) => model.setValue(codeEditorValue));
          }
        },
        nthIndex,
        value
      );
    });
    await this.retry.try(async () => {
      const newCodeEditorValue = await this.getCodeEditorValue(nthIndex);
      expect(newCodeEditorValue).equal(
        value,
        `Expected value was: ${value}, but got: ${newCodeEditorValue}`
      );
    });
  }

  public async getCurrentMarkers(testSubjId: string) {
    return this.findService.allByCssSelector(
      `[data-test-subj="${testSubjId}"] .cdr.squiggly-error`
    );
  }
}
