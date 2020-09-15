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

import { FtrProviderContext } from '../ftr_provider_context';

export function VegaChartPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const { common } = getPageObjects(['common']);

  class VegaChartPage {
    public async getSpec() {
      // Adapted from console_page.js:getVisibleTextFromAceEditor(). Is there a common utilities file?
      const editor = await testSubjects.find('vega-editor');
      const lines = await editor.findAllByClassName('ace_line_group');
      const linesText = await Promise.all(
        lines.map(async (line) => {
          return await line.getVisibleText();
        })
      );
      return linesText.join('\n');
    }

    public async typeInSpec(text: string) {
      const editor = await testSubjects.find('vega-editor');
      const textarea = await editor.findByClassName('ace_content');
      await textarea.click();
      let repeats = 20;
      while (--repeats > 0) {
        await browser.pressKeys(browser.keys.ARROW_UP);
        await common.sleep(50);
      }
      await browser.pressKeys(browser.keys.ARROW_RIGHT);
      await browser.pressKeys(text);
    }

    public async getViewContainer() {
      return await find.byCssSelector('div.vgaVis__view');
    }

    public async getControlContainer() {
      return await find.byCssSelector('div.vgaVis__controls');
    }

    public async getYAxisLabels() {
      const chart = await testSubjects.find('visualizationLoader');
      const yAxis = await chart.findByCssSelector('[aria-label^="Y-axis"]');
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