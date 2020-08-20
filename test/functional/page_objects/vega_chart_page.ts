/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Key } from 'selenium-webdriver';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const compareSpecs = (first: string, second: string) => {
  const normalizeSpec = (spec: string) => spec.replace(/[\n ]/g, '');
  return normalizeSpec(first) === normalizeSpec(second);
};

export function VegaChartPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  class VegaChartPage {
    public getEditor() {
      return testSubjects.find('vega-editor');
    }

    public getViewContainer() {
      return find.byCssSelector('div.vgaVis__view');
    }

    public getControlContainer() {
      return find.byCssSelector('div.vgaVis__controls');
    }

    public getYAxisContainer() {
      return find.byCssSelector('[aria-label^="Y-axis"]');
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
      await retry.try(async () => {
        await this.cleanSpec();
        await this.focusEditor();
        await browser.pressKeys(newSpec);

        expect(compareSpecs(await this.getSpec(), newSpec)).to.be(true);
      });
    }

    public async typeInSpec(text: string) {
      const aceGutter = await this.getAceGutterContainer();

      await aceGutter.doubleClick();
      await browser.pressKeys(Key.LEFT);
      await browser.pressKeys(Key.RIGHT);
      await browser.pressKeys(text);
    }

    public async cleanSpec() {
      const aceGutter = await this.getAceGutterContainer();

      await retry.try(async () => {
        await aceGutter.doubleClick();
        await browser.pressKeys(Key.BACK_SPACE);

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

  return new VegaChartPage();
}
