/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

interface IntervalOptions {
  type?: 'default' | 'numeric' | 'custom';
  aggNth?: number;
  append?: boolean;
}

export class VisualizeEditorPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly visChart = this.ctx.getPageObject('visChart');

  public async clickDataTab() {
    await this.testSubjects.click('visEditorTab__data');
  }

  public async clickOptionsTab() {
    await this.testSubjects.click('visEditorTab__options');
  }

  public async clickMetricsAndAxes() {
    await this.testSubjects.click('visEditorTab__advanced');
  }

  public async clickVisEditorTab(tabName: string) {
    await this.testSubjects.click(`visEditorTab__${tabName}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async addInputControl(type?: string) {
    if (type) {
      const selectInput = await this.testSubjects.find('selectControlType');
      await selectInput.type(type);
    }
    await this.testSubjects.click('inputControlEditorAddBtn');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async inputControlClear() {
    await this.testSubjects.click('inputControlClearBtn');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async inputControlSubmit() {
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('inputControlSubmitBtn');
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  public async clickGo(isLegacyChartLib = false) {
    if ((await this.visChart.isNewChartsLibraryEnabled()) || !isLegacyChartLib) {
      await this.elasticChart.setNewChartUiDebugFlag();
    }

    await this.common.sleep(500); // wait for the visualization to render

    const prevRenderingCount = await this.visChart.getVisualizationRenderingCount();
    this.log.debug(`Before Rendering count ${prevRenderingCount}`);
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('visualizeEditorRenderButton');
    await this.visChart.waitForRenderingCount(prevRenderingCount + 1);
  }

  public async removeDimension(aggNth: number) {
    await this.testSubjects.click(`visEditorAggAccordion${aggNth} > removeDimensionBtn`);
  }

  public async setFilterParams(aggNth: number, indexPattern: string, field: string) {
    await this.comboBox.set(`indexPatternSelect-${aggNth}`, indexPattern);
    await this.comboBox.set(`fieldSelect-${aggNth}`, field);
  }

  public async setFilterRange(aggNth: number, min: string, max: string) {
    const control = await this.testSubjects.find(`inputControl${aggNth}`);
    const inputMin = await control.findByCssSelector('[name$="minValue"]');
    await inputMin.type(min);
    const inputMax = await control.findByCssSelector('[name$="maxValue"]');
    await inputMax.type(max);
  }

  public async clickSplitDirection(direction: string) {
    const radioBtn = await this.find.byCssSelector(
      `[data-test-subj="visEditorSplitBy-${direction}"]`
    );
    await radioBtn.click();
  }

  public async clickAddDateRange() {
    await this.testSubjects.click(`visEditorAddDateRange`);
  }

  public async setDateRangeByIndex(index: string, from: string, to: string) {
    await this.testSubjects.setValue(`visEditorDateRange${index}__from`, from);
    await this.testSubjects.setValue(`visEditorDateRange${index}__to`, to);
  }

  /**
   * Adds new bucket
   * @param bucketName bucket name, like 'X-axis', 'Split rows', 'Split series'
   * @param type aggregation type, like 'buckets', 'metrics'
   */
  public async clickBucket(bucketName: string, type = 'buckets') {
    await this.testSubjects.click(`visEditorAdd_${type}`);
    await this.testSubjects.click(`visEditorAdd_${type}_${bucketName}`);
  }

  public async clickEnableCustomRanges() {
    await this.testSubjects.click('heatmapUseCustomRanges');
  }

  public async clickAddRange() {
    await this.testSubjects.click(`heatmapColorRange__addRangeButton`);
  }

  public async setCustomRangeByIndex(index: string | number, from: string, to: string) {
    await this.testSubjects.setValue(`heatmapColorRange${index}__from`, from);
    await this.testSubjects.setValue(`heatmapColorRange${index}__to`, to);
  }

  public async changeHeatmapColorNumbers(value = 6) {
    await this.testSubjects.setValue('heatmapColorsNumber', `${value}`);
  }

  public async getBucketErrorMessage() {
    const error = await this.find.byCssSelector(
      '[data-test-subj="bucketsAggGroup"] [data-test-subj="defaultEditorAggSelect"] + .euiFormErrorText'
    );
    const errorMessage = await error.getAttribute('innerText');
    this.log.debug(errorMessage);
    return errorMessage;
  }

  public async addNewFilterAggregation() {
    await this.testSubjects.click('visEditorAddFilterButton');
  }

  public async selectField(
    fieldValue: string,
    groupName = 'buckets',
    isChildAggregation = false,
    aggregationIndex = 0
  ) {
    this.log.debug(`selectField ${fieldValue}`);
    const selector = `
        [data-test-subj="${groupName}AggGroup"]
        [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen
        [data-test-subj="visAggEditorParams"]
        ${isChildAggregation ? '.visEditorAgg__subAgg' : ''}
        [data-test-subj="visDefaultEditorField"]
      `;
    const fieldEls = await this.find.allByCssSelector(selector);
    await this.comboBox.setElement(fieldEls[aggregationIndex], fieldValue);
  }

  public async selectOrderByMetric(aggNth: number, metric: string) {
    const sortSelect = await this.testSubjects.find(`visEditorOrderBy${aggNth}`);
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
    isChildAggregation = false,
    aggregationIndex = 0
  ) {
    const comboBoxElements = await this.find.allByCssSelector(`
        [data-test-subj="${groupName}AggGroup"]
        [data-test-subj^="visEditorAggAccordion"].euiAccordion-isOpen
        ${isChildAggregation ? '.visEditorAgg__subAgg' : ''}
        [data-test-subj="defaultEditorAggSelect"]
      `);

    await this.comboBox.setElement(comboBoxElements[aggregationIndex], aggValue);
    await this.common.sleep(500);
  }

  /**
   * Set the test for a filter aggregation.
   * @param {*} filterValue the string value of the filter
   * @param {*} filterIndex used when multiple filters are configured on the same aggregation
   * @param {*} aggregationId the ID if the aggregation. On Tests, it start at from 2
   */
  public async setFilterAggregationValue(filterValue: string, filterIndex = 0, aggregationId = 2) {
    await this.testSubjects.setValue(
      `visEditorFilterInput_${aggregationId}_${filterIndex}`,
      filterValue
    );
  }

  public async setValue(newValue: string) {
    const input = await this.find.byCssSelector(
      '[data-test-subj="visEditorPercentileRanks"] input'
    );
    this.log.debug(`Setting percentile rank value of ${newValue}`);
    await input.clearValue();
    await input.type(newValue);
  }

  public async setPercentileValue(newValue: string, index: number = 0) {
    const correctIndex = index * 2 + 1;
    const input = await this.find.byCssSelector(
      `[data-test-subj="visEditorPercentile"]>div:nth-child(2)>div:nth-child(${correctIndex}) input`
    );
    this.log.debug(`Setting percentile value at ${index}th input of ${newValue}`);
    await input.clearValueWithKeyboard();
    await input.type(newValue, { charByChar: true });
  }

  public async clickEditorSidebarCollapse() {
    await this.testSubjects.click('collapseSideBarButton');
  }

  public async clickDropPartialBuckets() {
    await this.testSubjects.click('dropPartialBucketsCheckbox');
  }

  public async expectMarkdownTextArea() {
    await this.testSubjects.existOrFail('markdownTextarea');
  }

  public async setMarkdownTxt(markdownTxt: string) {
    const input = await this.testSubjects.find('markdownTextarea');
    await input.clearValue();
    await input.type(markdownTxt);
  }

  public async isSwitchChecked(selector: string) {
    const checkbox = await this.testSubjects.find(selector);
    const isChecked = await checkbox.getAttribute('aria-checked');
    return isChecked === 'true';
  }

  public async checkSwitch(selector: string) {
    const isChecked = await this.isSwitchChecked(selector);
    if (!isChecked) {
      this.log.debug(`checking switch ${selector}`);
      await this.testSubjects.click(selector);
    }
  }

  public async uncheckSwitch(selector: string) {
    const isChecked = await this.isSwitchChecked(selector);
    if (isChecked) {
      this.log.debug(`unchecking switch ${selector}`);
      await this.testSubjects.click(selector);
    }
  }

  public async setIsFilteredByCollarCheckbox(value = true) {
    await this.retry.try(async () => {
      const isChecked = await this.isSwitchChecked('isFilteredByCollarCheckbox');
      if (isChecked !== value) {
        await this.testSubjects.click('isFilteredByCollarCheckbox');
        throw new Error('isFilteredByCollar not set correctly');
      }
    });
  }

  public async setCustomLabel(label: string, index: number | string = 1) {
    const customLabel = await this.testSubjects.find(`visEditorStringInput${index}customLabel`);
    await customLabel.type(label);
  }

  public async selectYAxisAggregation(agg: string, field: string, label: string, index = 1) {
    // index starts on the first "count" metric at 1
    // Each new metric or aggregation added to a visualization gets the next index.
    // So to modify a metric or aggregation tests need to keep track of the
    // order they are added.
    await this.toggleOpenEditor(index);

    // select our agg
    const aggSelect = await this.find.byCssSelector(
      `#visEditorAggAccordion${index} [data-test-subj="defaultEditorAggSelect"]`
    );
    await this.comboBox.setElement(aggSelect, agg);

    const fieldSelect = await this.find.byCssSelector(
      `#visEditorAggAccordion${index} [data-test-subj="visDefaultEditorField"]`
    );
    // select our field
    await this.comboBox.setElement(fieldSelect, field);
    // enter custom label
    await this.setCustomLabel(label, index);
  }

  public async getField() {
    return await this.comboBox.getComboBoxSelectedOptions('visDefaultEditorField');
  }

  public async sizeUpEditor() {
    const resizerPanel = await this.testSubjects.find('euiResizableButton');
    // Drag panel 100 px left
    await this.browser.dragAndDrop({ location: resizerPanel }, { location: { x: -100, y: 0 } });
  }

  public async toggleDisabledAgg(agg: string | number) {
    await this.testSubjects.click(`visEditorAggAccordion${agg} > ~toggleDisableAggregationBtn`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async toggleAggregationEditor(agg: string | number) {
    await this.find.clickByCssSelector(
      `[data-test-subj="visEditorAggAccordion${agg}"] .euiAccordion__button`
    );
    await this.header.waitUntilLoadingHasFinished();
  }

  public async toggleOtherBucket(agg: string | number = 2) {
    await this.testSubjects.click(`visEditorAggAccordion${agg} > otherBucketSwitch`);
  }

  public async toggleMissingBucket(agg: string | number = 2) {
    await this.testSubjects.click(`visEditorAggAccordion${agg} > missingBucketSwitch`);
  }

  public async toggleScaleMetrics() {
    await this.testSubjects.click('scaleMetricsSwitch');
  }

  public async toggleAutoMode() {
    await this.testSubjects.click('visualizeEditorAutoButton');
  }

  public async togglePieLegend() {
    await this.testSubjects.click('visTypePieAddLegendSwitch');
  }

  public async togglePieNestedLegend() {
    await this.testSubjects.click('visTypePieNestedLegendSwitch');
  }

  public async isApplyEnabled() {
    const applyButton = await this.testSubjects.find('visualizeEditorRenderButton');
    return await applyButton.isEnabled();
  }

  public async toggleAccordion(id: string, toState = 'true') {
    const toggle = await this.find.byCssSelector(`button[aria-controls="${id}"]`);
    const toggleOpen = await toggle.getAttribute('aria-expanded');
    this.log.debug(`toggle ${id} expand = ${toggleOpen}`);
    if (toggleOpen !== toState) {
      this.log.debug(`toggle ${id} click()`);
      await toggle.click();
    }
  }

  public async toggleOpenEditor(index: number, toState = 'true') {
    // index, see selectYAxisAggregation
    await this.toggleAccordion(`visEditorAggAccordion${index}`, toState);
  }

  public async toggleAdvancedParams(aggId: string) {
    const accordion = await this.testSubjects.find(`advancedParams-${aggId}`);
    const accordionButton = await this.find.descendantDisplayedByCssSelector('button', accordion);
    await accordionButton.click();
  }

  public async inputValueInCodeEditor(value: string) {
    const codeEditor = await this.find.byCssSelector('.react-monaco-editor-container');
    const textarea = await codeEditor.findByClassName('monaco-mouse-cursor-text');

    await textarea.click();
    await this.browser.pressKeys(value);
  }

  public async clickReset() {
    await this.testSubjects.click('visualizeEditorResetButton');
    await this.visChart.waitForVisualization();
  }

  public async clickYAxisOptions(axisId: string) {
    await this.testSubjects.click(`toggleYAxisOptions-${axisId}`);
  }

  public async changeYAxisShowCheckbox(axisId: string, enabled: boolean) {
    const selector = `valueAxisShow-${axisId}`;
    const button = await this.testSubjects.find(selector);
    const isEnabled = (await button.getAttribute('aria-checked')) === 'true';
    if (enabled !== isEnabled) {
      await button.click();
    }
  }

  public async changeYAxisFilterLabelsCheckbox(axisId: string, enabled: boolean) {
    const selector = `yAxisFilterLabelsCheckbox-${axisId}`;
    const button = await this.testSubjects.find(selector);
    const isEnabled = (await button.getAttribute('aria-checked')) === 'true';
    if (enabled !== isEnabled) {
      await button.click();
    }
  }

  public async setSize(newValue: number, aggId?: number) {
    const dataTestSubj = aggId
      ? `visEditorAggAccordion${aggId} > sizeParamEditor`
      : 'sizeParamEditor';
    await this.testSubjects.setValue(dataTestSubj, String(newValue));
  }

  public async selectChartMode(mode: string) {
    const selector = await this.find.byCssSelector(`#seriesMode0 > option[value="${mode}"]`);
    await selector.click();
  }

  public async selectYAxisScaleType(axisId: string, scaleType: string) {
    const selector = await this.find.byCssSelector(
      `#scaleSelectYAxis-${axisId} > option[value="${scaleType}"]`
    );
    await selector.click();
  }

  public async selectXAxisPosition(position: string) {
    const option = await (
      await this.testSubjects.find('categoryAxisPosition')
    ).findByCssSelector(`option[value="${position}"]`);
    await option.click();
  }

  public async selectYAxisPosition(axisId: string, position: string) {
    const option = await (
      await this.testSubjects.find(`valueAxisPosition-${axisId}`)
    ).findByCssSelector(`option[value="${position}"]`);
    await option.click();
  }

  public async selectYAxisMode(mode: string) {
    const selector = await this.find.byCssSelector(`#valueAxisMode0 > option[value="${mode}"]`);
    await selector.click();
  }

  public async setAxisExtents(min: string, max: string, axisId = 'ValueAxis-1') {
    await this.toggleAccordion(`yAxisAccordion${axisId}`);
    await this.toggleAccordion(`yAxisOptionsAccordion${axisId}`);

    await this.testSubjects.click('yAxisSetYExtents');
    await this.testSubjects.setValue('yAxisYExtentsMax', max);
    await this.testSubjects.setValue('yAxisYExtentsMin', min);
  }

  public async selectAggregateWith(fieldValue: string) {
    await this.testSubjects.selectValue('visDefaultEditorAggregateWith', fieldValue);
  }

  public async setInterval(newValue: string | number, options: IntervalOptions = {}) {
    const newValueString = `${newValue}`;
    const { type = 'default', aggNth = 2, append = false } = options;
    this.log.debug(`visEditor.setInterval(${newValueString}, {${type}, ${aggNth}, ${append}})`);
    if (type === 'default') {
      await this.comboBox.set('visEditorInterval', newValueString);
    } else if (type === 'custom') {
      await this.comboBox.setCustom('visEditorInterval', newValueString);
    } else {
      if (type === 'numeric') {
        const autoMode = await this.testSubjects.getAttribute(
          `visEditorIntervalSwitch${aggNth}`,
          'aria-checked'
        );
        if (autoMode === 'true') {
          await this.testSubjects.click(`visEditorIntervalSwitch${aggNth}`);
        }
      }
      if (append) {
        await this.testSubjects.append(`visEditorInterval${aggNth}`, String(newValueString));
      } else {
        await this.testSubjects.setValue(`visEditorInterval${aggNth}`, String(newValueString));
      }
    }
  }

  public async getInterval() {
    return await this.comboBox.getComboBoxSelectedOptions('visEditorInterval');
  }

  public async getNumericInterval(aggNth = 2) {
    return await this.testSubjects.getAttribute(`visEditorInterval${aggNth}`, 'value');
  }

  public async clickMetricEditor() {
    await this.find.clickByCssSelector('[data-test-subj="metricsAggGroup"] .euiAccordion__button');
  }

  public async clickMetricByIndex(index: number) {
    const metrics = await this.find.allByCssSelector(
      '[data-test-subj="visualizationLoader"] .legacyMtrVis .legacyMtrVis__container'
    );
    expect(metrics.length).greaterThan(index);
    await metrics[index].click();
  }

  public async setSelectByOptionText(selectId: string, optionText: string) {
    const selectField = await this.find.byCssSelector(`#${selectId}`);
    const options = await this.find.allByCssSelector(`#${selectId} > option`);
    const $ = await selectField.parseDomContent();
    const optionsText = $('option')
      .toArray()
      .map((option) => $(option).text());
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

  // point series

  async clickAddAxis() {
    return await this.testSubjects.click('visualizeAddYAxisButton');
  }

  async setAxisTitle(title: string, aggNth = 0) {
    return await this.testSubjects.setValue(`valueAxisTitle${aggNth}`, title);
  }

  public async toggleGridCategoryLines() {
    return await this.testSubjects.click('showCategoryLines');
  }

  public async toggleShowThresholdLine() {
    return await this.testSubjects.click('xyShowThresholdLine');
  }

  public async toggleValuesOnChart() {
    return await this.testSubjects.click('showValuesOnChart');
  }

  public async setGridValueAxis(axis: string) {
    this.log.debug(`setGridValueAxis(${axis})`);
    await this.find.selectValue('select#gridAxis', axis);
  }

  public async setSeriesAxis(seriesNth: number, axis: string) {
    await this.find.selectValue(`select#seriesValueAxis${seriesNth}`, axis);
  }

  public async setSeriesType(seriesNth: number, type: string) {
    await this.find.selectValue(`select#seriesType${seriesNth}`, type);
  }

  public async setTimelionInterval(interval: string) {
    const timelionIntervalComboBoxSelector = 'timelionIntervalComboBox';
    await this.comboBox.clearInputField(timelionIntervalComboBoxSelector);
    await this.comboBox.setCustom(timelionIntervalComboBoxSelector, interval);
  }
}
