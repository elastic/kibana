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

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function VegaChartPageProvider({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const screenshot = getService('screenshots');
  const log = getService('log');
  const { visEditor, visChart } = getPageObjects(['visEditor', 'visChart']);

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

    public async getViewContainer() {
      return await find.byCssSelector('div.vgaVis__view');
    }

    public async getControlContainer() {
      return await find.byCssSelector('div.vgaVis__controls');
    }

    /**
     * Removes chrome and takes a small screenshot of a vis to compare against a baseline.
     * @param {string} name The name of the baseline image.
     * @param {object} opts Options object.
     * @param {number} opts.threshold Threshold for allowed variance when comparing images.
     */
    public async expectVisToMatchScreenshot(name: string, opts = { threshold: 0.05 }) {
      log.debug(`expectVisToMatchScreenshot(${name})`);

      // Collapse sidebar and inject some CSS to hide the nav so we have a focused screenshot
      await visEditor.clickEditorSidebarCollapse();
      await visChart.waitForVisualizationRenderingStabilized();
      await browser.execute(`
          var el = document.createElement('style');
          el.id = '__data-test-style';
          el.innerHTML = '[data-test-subj="headerGlobalNav"] { display: none; } ';
          el.innerHTML += '[data-test-subj="top-nav"] { display: none; } ';
          el.innerHTML += '[data-test-subj="experimentalVisInfo"] { display: none; } ';
          document.body.appendChild(el);
        `);

      const percentDifference = await screenshot.compareAgainstBaseline(name, updateBaselines);

      // Reset the chart to its original state
      await browser.execute(`
          var el = document.getElementById('__data-test-style');
          document.body.removeChild(el);
        `);
      await visEditor.clickEditorSidebarCollapse();
      await visChart.waitForVisualizationRenderingStabilized();
      expect(percentDifference).to.be.lessThan(opts.threshold);
    }
  }

  return new VegaChartPage();
}
