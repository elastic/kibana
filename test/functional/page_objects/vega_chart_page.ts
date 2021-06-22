/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

const compareSpecs = (first: string, second: string) => {
  const normalizeSpec = (spec: string) => spec.replace(/[\n ]/g, '');
  return normalizeSpec(first) === normalizeSpec(second);
};

export class VegaChartPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly browser = this.ctx.getService('browser');
  private readonly retry = this.ctx.getService('retry');

  public getEditor() {
    return this.testSubjects.find('vega-editor');
  }

  public getViewContainer() {
    return this.find.byCssSelector('div.vgaVis__view');
  }

  public getControlContainer() {
    return this.find.byCssSelector('div.vgaVis__controls');
  }

  public getYAxisContainer() {
    return this.find.byCssSelector('[aria-label^="Y-axis"]');
  }

  public async getAceGutterContainer() {
    const editor = await this.getEditor();
    return editor.findByClassName('ace_gutter');
  }

  public async getRawSpec() {
    // Adapted from console_page.js:getVisibleTextFromAceEditor(). Is there a common utilities file?
    const editor = await this.getEditor();
    const lines = await editor.findAllByClassName('ace_line_group');

    return await Promise.all(
      lines.map(async (line) => {
        return await line.getVisibleText();
      })
    );
  }

  public async getSpec() {
    return (await this.getRawSpec()).join('\n');
  }

  public async focusEditor() {
    const editor = await this.getEditor();
    const textarea = await editor.findByClassName('ace_content');

    await textarea.click();
  }

  public async fillSpec(newSpec: string) {
    await this.retry.try(async () => {
      await this.cleanSpec();
      await this.focusEditor();
      await this.browser.pressKeys(newSpec);

      expect(compareSpecs(await this.getSpec(), newSpec)).to.be(true);
    });
  }

  public async typeInSpec(text: string) {
    const aceGutter = await this.getAceGutterContainer();

    await aceGutter.doubleClick();
    await this.browser.pressKeys(this.browser.keys.RIGHT);
    await this.browser.pressKeys(this.browser.keys.LEFT);
    await this.browser.pressKeys(this.browser.keys.LEFT);
    await this.browser.pressKeys(text);
  }

  public async cleanSpec() {
    const aceGutter = await this.getAceGutterContainer();

    await this.retry.try(async () => {
      await aceGutter.doubleClick();
      await this.browser.pressKeys(this.browser.keys.BACK_SPACE);

      expect(await this.getSpec()).to.be('');
    });
  }

  public async getYAxisLabels() {
    const yAxis = await this.getYAxisContainer();
    const tickGroup = await yAxis.findByClassName('role-axis-label');
    const labels = await tickGroup.findAllByCssSelector('text');
    const labelTexts: string[] = [];

    for (const label of labels) {
      labelTexts.push(await label.getVisibleText());
    }
    return labelTexts;
  }
}
