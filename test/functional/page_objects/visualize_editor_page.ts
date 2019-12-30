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

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../ftr_provider_context';

export function VisualizeEditorPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const { common, header, visChart } = getPageObjects(['common', 'header', 'visChart']);

  class VisualizeEditorPage {
    public async clickDataTab() {
      await testSubjects.click('visualizeEditDataLink');
    }

    public async clickOptionsTab() {
      await testSubjects.click('visEditorTaboptions');
    }

    public async clickMetricsAndAxes() {
      await testSubjects.click('visEditorTabadvanced');
    }

    public async clickVisEditorTab(tabName: string) {
      await testSubjects.click('visEditorTab' + tabName);
      await header.waitUntilLoadingHasFinished();
    }

    public async addInputControl(type?: string) {
      if (type) {
        const selectInput = await testSubjects.find('selectControlType');
        await selectInput.type(type);
      }
      await testSubjects.click('inputControlEditorAddBtn');
      await header.waitUntilLoadingHasFinished();
    }

    public async inputControlClear() {
      await testSubjects.click('inputControlClearBtn');
      await header.waitUntilLoadingHasFinished();
    }

    public async inputControlSubmit() {
      await testSubjects.clickWhenNotDisabled('inputControlSubmitBtn');
      await visChart.waitForVisualizationRenderingStabilized();
    }

    public async clickGo() {
      const prevRenderingCount = await visChart.getVisualizationRenderingCount();
      log.debug(`Before Rendering count ${prevRenderingCount}`);
      await testSubjects.clickWhenNotDisabled('visualizeEditorRenderButton');
      await visChart.waitForRenderingCount(prevRenderingCount + 1);
    }

    public async removeDimension(aggNth: number) {
      await testSubjects.click(`visEditorAggAccordion${aggNth} > removeDimensionBtn`);
    }

    public async setFilterParams(aggNth: number, indexPattern: string, field: string) {
      await comboBox.set(`indexPatternSelect-${aggNth}`, indexPattern);
      await comboBox.set(`fieldSelect-${aggNth}`, field);
    }

    public async setFilterRange(aggNth: number, min: string, max: string) {
      const control = await testSubjects.find(`inputControl${aggNth}`);
      const inputMin = await control.findByCssSelector('[name$="minValue"]');
      await inputMin.type(min);
      const inputMax = await control.findByCssSelector('[name$="maxValue"]');
      await inputMax.type(max);
    }

    public async clickSplitDirection(direction: string) {
      const control = await testSubjects.find('visEditorSplitBy');
      const radioBtn = await control.findByCssSelector(`[title="${direction}"]`);
      await radioBtn.click();
    }

    /**
     * Adds new bucket
     * @param bucketName bucket name, like 'X-axis', 'Split rows', 'Split series'
     * @param type aggregation type, like 'buckets', 'metrics'
     */
    public async clickBucket(bucketName: string, type = 'buckets') {
      await testSubjects.click(`visEditorAdd_${type}`);
      await find.clickByCssSelector(`[data-test-subj="visEditorAdd_${type}_${bucketName}"`);
    }

    public async clickEnableCustomRanges() {
      await testSubjects.click('heatmapUseCustomRanges');
    }

    public async clickAddRange() {
      await testSubjects.click(`heatmapColorRange__addRangeButton`);
    }

    public async setCustomRangeByIndex(index: string, from: string, to: string) {
      await testSubjects.setValue(`heatmapColorRange${index}__from`, from);
      await testSubjects.setValue(`heatmapColorRange${index}__to`, to);
    }

    public async changeHeatmapColorNumbers(value = 6) {
      const input = await testSubjects.find(`heatmapColorsNumber`);
      await input.clearValueWithKeyboard();
      await input.type(`${value}`);
    }

    public async getBucketErrorMessage() {
      const error = await find.byCssSelector(
        '[group-name="buckets"] [data-test-subj="defaultEditorAggSelect"] + .euiFormErrorText'
      );
      const errorMessage = await error.getAttribute('innerText');
      log.debug(errorMessage);
      return errorMessage;
    }

    public async addNewFilterAggregation() {
      await testSubjects.click('visEditorAddFilterButton');
    }

    public async selectField(
      fieldValue: string,
      groupName = 'buckets',
      childAggregationType = false
    ) {
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

    public async selectOrderByMetric(aggNth: number, metric: string) {
      const sortSelect = await testSubjects.find(`visEditorOrderBy${aggNth}`);
      const sortMetric = await sortSelect.findByCssSelector(`option[value="${metric}"]`);
      await sortMetric.click();
    }

    public async selectCustomSortMetric(aggNth: number, metric: string, field: string) {
      await this.selectOrderByMetric(aggNth, 'custom');
      await this.selectAggregation(metric, 'buckets', true);
      await this.selectField(field, 'buckets', true);
    }

    public async selectAggregation(
      aggValue: string,
      groupName = 'buckets',
      childAggregationType = false
    ) {
      const comboBoxElement = await find.byCssSelector(`
          [group-name="${groupName}"]
          [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen
          ${childAggregationType ? '.visEditorAgg__subAgg' : ''}
          [data-test-subj="defaultEditorAggSelect"]
        `);

      await comboBox.setElement(comboBoxElement, aggValue);
      await common.sleep(500);
    }

    /**
     * Set the test for a filter aggregation.
     * @param {*} filterValue the string value of the filter
     * @param {*} filterIndex used when multiple filters are configured on the same aggregation
     * @param {*} aggregationId the ID if the aggregation. On Tests, it start at from 2
     */
    public async setFilterAggregationValue(
      filterValue: string,
      filterIndex = 0,
      aggregationId = 2
    ) {
      await testSubjects.setValue(
        `visEditorFilterInput_${aggregationId}_${filterIndex}`,
        filterValue
      );
    }

    public async setValue(newValue: string) {
      const input = await find.byCssSelector('[data-test-subj="visEditorPercentileRanks"] input');
      await input.clearValue();
      await input.type(newValue);
    }

    public async clickEditorSidebarCollapse() {
      await testSubjects.click('collapseSideBarButton');
    }

    public async clickDropPartialBuckets() {
      await testSubjects.click('dropPartialBucketsCheckbox');
    }

    public async setMarkdownTxt(markdownTxt: string) {
      const input = await testSubjects.find('markdownTextarea');
      await input.clearValue();
      await input.type(markdownTxt);
    }

    public async isSwitchChecked(selector: string) {
      const checkbox = await testSubjects.find(selector);
      const isChecked = await checkbox.getAttribute('aria-checked');
      return isChecked === 'true';
    }

    public async checkSwitch(selector: string) {
      const isChecked = await this.isSwitchChecked(selector);
      if (!isChecked) {
        log.debug(`checking switch ${selector}`);
        await testSubjects.click(selector);
      }
    }

    public async uncheckSwitch(selector: string) {
      const isChecked = await this.isSwitchChecked(selector);
      if (isChecked) {
        log.debug(`unchecking switch ${selector}`);
        await testSubjects.click(selector);
      }
    }

    public async setIsFilteredByCollarCheckbox(value = true) {
      await retry.try(async () => {
        const isChecked = await this.isSwitchChecked('isFilteredByCollarCheckbox');
        if (isChecked !== value) {
          await testSubjects.click('isFilteredByCollarCheckbox');
          throw new Error('isFilteredByCollar not set correctly');
        }
      });
    }

    public async setCustomLabel(label: string, index = 1) {
      const customLabel = await testSubjects.find(`visEditorStringInput${index}customLabel`);
      customLabel.type(label);
    }

    public async selectYAxisAggregation(agg: string, field: string, label: string, index = 1) {
      // index starts on the first "count" metric at 1
      // Each new metric or aggregation added to a visualization gets the next index.
      // So to modify a metric or aggregation tests need to keep track of the
      // order they are added.
      await this.toggleOpenEditor(index);

      // select our agg
      const aggSelect = await find.byCssSelector(
        `#visEditorAggAccordion${index} [data-test-subj="defaultEditorAggSelect"]`
      );
      await comboBox.setElement(aggSelect, agg);

      const fieldSelect = await find.byCssSelector(
        `#visEditorAggAccordion${index} [data-test-subj="visDefaultEditorField"]`
      );
      // select our field
      await comboBox.setElement(fieldSelect, field);
      // enter custom label
      await this.setCustomLabel(label, index);
    }

    public async getField() {
      return await comboBox.getComboBoxSelectedOptions('visDefaultEditorField');
    }

    public async sizeUpEditor() {
      await testSubjects.click('visualizeEditorResizer');
      await browser.pressKeys(browser.keys.ARROW_RIGHT);
    }

    public async toggleDisabledAgg(agg: string) {
      await testSubjects.click(`visEditorAggAccordion${agg} > ~toggleDisableAggregationBtn`);
      await header.waitUntilLoadingHasFinished();
    }

    public async toggleAggregationEditor(agg: string) {
      await find.clickByCssSelector(
        `[data-test-subj="visEditorAggAccordion${agg}"] .euiAccordion__button`
      );
      await header.waitUntilLoadingHasFinished();
    }

    public async toggleOtherBucket(agg = 2) {
      await testSubjects.click(`visEditorAggAccordion${agg} > otherBucketSwitch`);
    }

    public async toggleMissingBucket(agg = 2) {
      await testSubjects.click(`visEditorAggAccordion${agg} > missingBucketSwitch`);
    }

    public async toggleScaleMetrics() {
      await testSubjects.click('scaleMetricsSwitch');
    }

    public async toggleAutoMode() {
      await testSubjects.click('visualizeEditorAutoButton');
    }

    public async isApplyEnabled() {
      const applyButton = await testSubjects.find('visualizeEditorRenderButton');
      return await applyButton.isEnabled();
    }

    public async toggleAccordion(id: string, toState = 'true') {
      const toggle = await find.byCssSelector(`button[aria-controls="${id}"]`);
      const toggleOpen = await toggle.getAttribute('aria-expanded');
      log.debug(`toggle ${id} expand = ${toggleOpen}`);
      if (toggleOpen !== toState) {
        log.debug(`toggle ${id} click()`);
        await toggle.click();
      }
    }

    public async toggleOpenEditor(index: number, toState = 'true') {
      // index, see selectYAxisAggregation
      await this.toggleAccordion(`visEditorAggAccordion${index}`, toState);
    }

    public async toggleAdvancedParams(aggId: string) {
      const accordion = await testSubjects.find(`advancedParams-${aggId}`);
      const accordionButton = await find.descendantDisplayedByCssSelector('button', accordion);
      await accordionButton.click();
    }

    public async clickReset() {
      await testSubjects.click('visualizeEditorResetButton');
      await visChart.waitForVisualization();
    }

    public async clickYAxisOptions(axisId: string) {
      await testSubjects.click(`toggleYAxisOptions-${axisId}`);
    }

    public async clickYAxisAdvancedOptions(axisId: string) {
      await testSubjects.click(`toggleYAxisAdvancedOptions-${axisId}`);
    }

    public async changeYAxisFilterLabelsCheckbox(axisId: string, enabled: boolean) {
      const selector = `yAxisFilterLabelsCheckbox-${axisId}`;
      await testSubjects.setCheckbox(selector, enabled ? 'check' : 'uncheck');
    }

    public async setSize(newValue: string, aggId: string) {
      const dataTestSubj = aggId
        ? `visEditorAggAccordion${aggId} > sizeParamEditor`
        : 'sizeParamEditor';
      await testSubjects.setValue(dataTestSubj, String(newValue));
    }

    public async selectChartMode(mode: string) {
      const selector = await find.byCssSelector(`#seriesMode0 > option[value="${mode}"]`);
      await selector.click();
    }

    public async selectYAxisScaleType(axisId: string, scaleType: string) {
      const selectElement = await testSubjects.find(`scaleSelectYAxis-${axisId}`);
      const selector = await selectElement.findByCssSelector(`option[value="${scaleType}"]`);
      await selector.click();
    }

    public async selectYAxisMode(mode: string) {
      const selector = await find.byCssSelector(`#valueAxisMode0 > option[value="${mode}"]`);
      await selector.click();
    }

    public async setAxisExtents(min: string, max: string, axisId = 'ValueAxis-1') {
      await this.toggleAccordion(`yAxisAccordion${axisId}`);
      await this.toggleAccordion(`yAxisOptionsAccordion${axisId}`);

      await testSubjects.click('yAxisSetYExtents');
      await testSubjects.setValue('yAxisYExtentsMax', max);
      await testSubjects.setValue('yAxisYExtentsMin', min);
    }

    public async selectAggregateWith(fieldValue: string) {
      await testSubjects.selectValue('visDefaultEditorAggregateWith', fieldValue);
    }

    public async setInterval(newValue: string) {
      await comboBox.set('visEditorInterval', newValue);
    }

    public async getInterval() {
      return await comboBox.getComboBoxSelectedOptions('visEditorInterval');
    }

    public async setCustomInterval(newValue: string) {
      await comboBox.setCustom('visEditorInterval', newValue);
    }

    public async setNumericInterval(newValue: string, options = { append: false }, agg = 2) {
      if (options.append) {
        await testSubjects.append(`visEditorInterval${agg}`, String(newValue));
      } else {
        await testSubjects.setValue(`visEditorInterval${agg}`, String(newValue));
      }
    }

    public async getNumericInterval(agg = 2) {
      return await testSubjects.getAttribute(`visEditorInterval${agg}`, 'value');
    }

    public async clickMetricEditor() {
      await find.clickByCssSelector('[group-name="metrics"] .euiAccordion__button');
    }

    public async clickMetricByIndex(index: number) {
      const metrics = await find.allByCssSelector(
        '[data-test-subj="visualizationLoader"] .mtrVis .mtrVis__container'
      );
      expect(metrics.length).greaterThan(index);
      await metrics[index].click();
    }

    public async setSelectByOptionText(selectId: string, optionText: string) {
      const selectField = await find.byCssSelector(`#${selectId}`);
      const options = await find.allByCssSelector(`#${selectId} > option`);
      const $ = await selectField.parseDomContent();
      const optionsText = $('option')
        .toArray()
        .map(option => $(option).text());
      const optionIndex = optionsText.indexOf(optionText);

      if (optionIndex === -1) {
        throw new Error(
          `Unable to find option '${optionText}' in select ${selectId}. Available options: ${optionsText.join(
            ','
          )}`
        );
      }
      await options[optionIndex].click();
    }
  }

  return new VisualizeEditorPage();
}
