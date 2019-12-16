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

export function VisualEditorPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const { common, header, visualize } = getPageObjects(['common', 'header', 'visualize']);

  class VisualEditorPage {
    async inputControlSubmit() {
      await testSubjects.clickWhenNotDisabled('inputControlSubmitBtn');
      await visualize.waitForVisualizationRenderingStabilized();
    }

    async addInputControl(type: string) {
      if (type) {
        const selectInput = await testSubjects.find('selectControlType');
        await selectInput.type(type);
      }
      await testSubjects.click('inputControlEditorAddBtn');
      await header.waitUntilLoadingHasFinished();
    }

    async clickGo() {
      const prevRenderingCount = await visualize.getVisualizationRenderingCount();
      log.debug(`Before Rendering count ${prevRenderingCount}`);
      await testSubjects.clickWhenNotDisabled('visualizeEditorRenderButton');
      await visualize.waitForRenderingCount(prevRenderingCount + 1);
    }

    async removeDimension(aggNth: number) {
      await testSubjects.click(`visEditorAggAccordion${aggNth} > removeDimensionBtn`);
    }

    async setFilterParams(aggNth: number, indexPattern: string, field: string) {
      await comboBox.set(`indexPatternSelect-${aggNth}`, indexPattern);
      await comboBox.set(`fieldSelect-${aggNth}`, field);
    }

    async setFilterRange(aggNth: number, min: string, max: string) {
      const control = await testSubjects.find(`inputControl${aggNth}`);
      const inputMin = await control.findByCssSelector('[name$="minValue"]');
      await inputMin.type(min);
      const inputMax = await control.findByCssSelector('[name$="maxValue"]');
      await inputMax.type(max);
    }

    async clickSplitDirection(direction: string) {
      const control = await testSubjects.find('visEditorSplitBy');
      const radioBtn = await control.findByCssSelector(`[title="${direction}"]`);
      await radioBtn.click();
    }

    async getBucketErrorMessage() {
      const error = await find.byCssSelector(
        '[group-name="buckets"] [data-test-subj="defaultEditorAggSelect"] + .euiFormErrorText'
      );
      const errorMessage = await error.getAttribute('innerText');
      log.debug(errorMessage);
      return errorMessage;
    }

    async selectOrderByMetric(aggNth: number, metric: string) {
      const sortSelect = await testSubjects.find(`visEditorOrderBy${aggNth}`);
      const sortMetric = await sortSelect.findByCssSelector(`option[value="${metric}"]`);
      await sortMetric.click();
    }

    async selectAggregation(aggValue: string, groupName = 'buckets', childAggregationType = false) {
      const comboBoxElement = await find.byCssSelector(`
          [group-name="${groupName}"]
          [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen
          ${childAggregationType ? '.visEditorAgg__subAgg' : ''}
          [data-test-subj="defaultEditorAggSelect"]
        `);

      await comboBox.setElement(comboBoxElement, aggValue);
      await common.sleep(500);
    }

    async selectField(fieldValue: string, groupName = 'buckets', childAggregationType = false) {
      log.debug(`selectField ${fieldValue}`);
      const selector = `
          [group-name="${groupName}"]
          [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen
          [data-test-subj="visAggEditorParams"]
          ${childAggregationType ? '.visEditorAgg__subAgg' : ''}
          [data-test-subj="visDefaultEditorField"]
        `;
      const fieldEl = await find.byCssSelector(selector);
      await comboBox.setElement(fieldEl, fieldValue);
    }

    async selectCustomSortMetric(aggNth: number, metric: string, field: string) {
      await this.selectOrderByMetric(aggNth, 'custom');
      await this.selectAggregation(metric, 'buckets', true);
      await this.selectField(field, 'buckets', true);
    }
  }

  return new VisualEditorPage();
}
