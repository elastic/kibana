/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DebugState } from '@elastic/charts';
import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

type Duration =
  | 'Milliseconds'
  | 'Seconds'
  | 'Minutes'
  | 'Hours'
  | 'Days'
  | 'Weeks'
  | 'Months'
  | 'Years';

type FromDuration = Duration | 'Picoseconds' | 'Nanoseconds' | 'Microseconds';
type ToDuration = Duration | 'Human readable';

export class VisualBuilderPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly timePicker = this.ctx.getPageObject('timePicker');
  private readonly visChart = this.ctx.getPageObject('visChart');

  public async resetPage(
    fromTime = 'Sep 19, 2015 @ 06:31:44.000',
    toTime = 'Sep 22, 2015 @ 18:31:44.000'
  ) {
    await this.common.navigateToUrl('visualize', 'create?type=metrics', {
      useActualUrl: true,
    });
    this.log.debug('Wait for initializing TSVB editor');
    await this.checkVisualBuilderIsPresent();
    this.log.debug('Set absolute time range from "' + fromTime + '" to "' + toTime + '"');
    await this.timePicker.setAbsoluteRange(fromTime, toTime);
    // 2 sec sleep until https://github.com/elastic/kibana/issues/46353 is fixed
    await this.common.sleep(2000);
  }

  public async checkTabIsLoaded(testSubj: string, name: string) {
    let isPresent = false;
    await this.retry.try(async () => {
      isPresent = await this.testSubjects.exists(testSubj, { timeout: 20000 });
      if (!isPresent) {
        isPresent = await this.testSubjects.exists('visNoResult', { timeout: 1000 });
      }
    });
    if (!isPresent) {
      throw new Error(`TSVB ${name} tab is not loaded`);
    }
  }

  public async checkTabIsSelected(chartType: string) {
    const chartTypeBtn = await this.testSubjects.find(`${chartType}TsvbTypeBtn`);
    const isSelected = await chartTypeBtn.getAttribute('aria-selected');

    if (isSelected !== 'true') {
      throw new Error(`TSVB ${chartType} tab is not selected`);
    }
  }

  public async checkPanelConfigIsPresent(chartType: string) {
    await this.testSubjects.existOrFail(`tvbPanelConfig__${chartType}`);
  }

  public async checkVisualBuilderIsPresent() {
    await this.checkTabIsLoaded('tvbVisEditor', 'Time Series');
  }

  public async checkTimeSeriesChartIsPresent() {
    const isPresent = await this.find.existsByCssSelector('.tvbVisTimeSeries');
    if (!isPresent) {
      throw new Error(`TimeSeries chart is not loaded`);
    }
  }

  public async checkTimeSeriesIsLight() {
    return await this.find.existsByCssSelector('.tvbVisTimeSeriesLight');
  }

  public async checkTimeSeriesLegendIsPresent() {
    const isPresent = await this.find.existsByCssSelector('.echLegend');
    if (!isPresent) {
      throw new Error(`TimeSeries legend is not loaded`);
    }
  }

  public async checkMetricTabIsPresent() {
    await this.checkTabIsLoaded('tsvbMetricValue', 'Metric');
  }

  public async checkGaugeTabIsPresent() {
    await this.checkTabIsLoaded('tvbVisGaugeContainer', 'Gauge');
  }

  public async checkTopNTabIsPresent() {
    await this.checkTabIsLoaded('tvbVisTopNTable', 'TopN');
  }

  public async clickMetric() {
    const button = await this.testSubjects.find('metricTsvbTypeBtn');
    await button.click();
  }

  public async clickMarkdown() {
    const button = await this.testSubjects.find('markdownTsvbTypeBtn');
    await button.click();
  }

  public async getMetricValue() {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.find.byCssSelector('.tvbVisMetric__value--primary');
    return metricValue.getVisibleText();
  }

  public async enterMarkdown(markdown: string) {
    await this.clearMarkdown();
    const input = await this.find.byCssSelector('.tvbMarkdownEditor__editor textarea');
    await input.type(markdown);
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  public async clearMarkdown() {
    await this.retry.waitForWithTimeout('text area is cleared', 20000, async () => {
      const input = await this.find.byCssSelector('.tvbMarkdownEditor__editor textarea');
      await input.clickMouseButton();
      await input.clearValueWithKeyboard();

      const linesContainer = await this.find.byCssSelector(
        '.tvbMarkdownEditor__editor .view-lines'
      );
      // lines of code in monaco-editor
      // text is not present in textarea
      const lines = await linesContainer.findAllByClassName('mtk1');
      return lines.length === 0;
    });
  }

  public async waitForMarkdownTextAreaCleaned() {
    const input = await this.find.byCssSelector('.tvbMarkdownEditor__editor textarea');
    await input.clearValueWithKeyboard();
    const text = await this.getMarkdownText();
    return text.length === 0;
  }

  public async getMarkdownText(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const el = await this.find.byCssSelector('.tvbVis');
    const text = await el.getVisibleText();
    return text;
  }

  /**
   *
   * getting all markdown variables list which located on `table` section
   *
   * **Note**: if `table` not have variables, use `getMarkdownTableNoVariables` method instead
   * @see {getMarkdownTableNoVariables}
   * @returns {Promise<Array<{key:string, value:string, selector:any}>>}
   * @memberof VisualBuilderPage
   */
  public async getMarkdownTableVariables(): Promise<
    Array<{ key: string; value: string; selector: WebElementWrapper }>
  > {
    const testTableVariables = await this.testSubjects.find('tsvbMarkdownVariablesTable');
    const variablesSelector = 'tbody tr';
    const exists = await this.find.existsByCssSelector(variablesSelector);
    if (!exists) {
      this.log.debug('variable list is empty');
      return [];
    }
    const variables = await testTableVariables.findAllByCssSelector(variablesSelector);

    const variablesKeyValueSelectorMap = await Promise.all(
      variables.map(async (variable) => {
        const subVars = await variable.findAllByCssSelector('td');
        const selector = await subVars[0].findByTagName('a');
        const key = await selector.getVisibleText();
        const value = await subVars[1].getVisibleText();
        this.log.debug(`markdown table variables table is: ${key} ${value}`);
        return { key, value, selector };
      })
    );
    return variablesKeyValueSelectorMap;
  }

  /**
   * return variable table message, if `table` is empty it will be fail
   *
   * **Note:** if `table` have variables, use `getMarkdownTableVariables` method instead
   * @see {@link VisualBuilderPage#getMarkdownTableVariables}
   * @returns
   * @memberof VisualBuilderPage
   */
  public async getMarkdownTableNoVariables() {
    return await this.testSubjects.getVisibleText('tvbMarkdownEditor__noVariables');
  }

  /**
   * get all sub-tabs count for `time series`, `metric`, `top n`, `gauge`, `markdown` or `table` tab.
   *
   * @returns {Promise<any[]>}
   * @memberof VisualBuilderPage
   */
  public async getSubTabs(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('[data-test-subj$="-subtab"]');
  }

  /**
   * switch markdown sub-tab for visualization
   *
   * @param {'data' | 'options'| 'markdown'} subTab
   * @memberof VisualBuilderPage
   */
  public async markdownSwitchSubTab(subTab: 'data' | 'options' | 'markdown') {
    const tab = await this.testSubjects.find(`${subTab}-subtab`);
    const isSelected = await tab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
      await tab.click();
    }
  }

  /**
   * setting label for markdown visualization
   *
   * @param {string} variableName
   * @param type
   * @memberof VisualBuilderPage
   */
  public async setMarkdownDataVariable(variableName: string, type: 'variable' | 'label') {
    const SELECTOR = type === 'label' ? '[placeholder="Label"]' : '[placeholder="Variable name"]';
    if (variableName) {
      await this.find.setValue(SELECTOR, variableName);
    } else {
      const input = await this.find.byCssSelector(SELECTOR);
      await input.clearValueWithKeyboard({ charByChar: true });
    }
  }

  public async clickSeriesOption(nth = 0) {
    const el = await this.testSubjects.findAll('seriesOptions');
    await el[nth].click();
  }

  public async clearOffsetSeries() {
    const el = await this.testSubjects.find('offsetTimeSeries');
    await el.clearValue();
  }

  public async toggleAutoApplyChanges() {
    await this.find.clickByCssSelector('#tsvbAutoApplyInput');
  }

  public async applyChanges() {
    await this.testSubjects.clickWhenNotDisabled('applyBtn');
  }

  /**
   * change the data formatter for template in an `options` label tab
   *
   * @param formatter - typeof formatter which you can use for presenting data. By default kibana show `Default` formatter
   */
  public async changeDataFormatter(
    formatter: 'default' | 'bytes' | 'number' | 'percent' | 'duration' | 'custom'
  ) {
    await this.testSubjects.click('tsvbDataFormatPicker');
    await this.testSubjects.click(`tsvbDataFormatPicker-${formatter}`);
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  public async setDrilldownUrl(value: string) {
    const drilldownEl = await this.testSubjects.find('drilldownUrl');

    await drilldownEl.clearValue();
    await drilldownEl.type(value, { charByChar: true });
    await this.header.waitUntilLoadingHasFinished();
  }

  /**
   * set duration formatter additional settings
   *
   * @param from start format
   * @param to end format
   * @param decimalPlaces decimals count
   */
  public async setDurationFormatterSettings({
    from,
    to,
    decimalPlaces,
  }: {
    from?: FromDuration;
    to?: ToDuration;
    decimalPlaces?: string;
  }) {
    if (from) {
      await this.retry.try(async () => {
        await this.comboBox.set('dataFormatPickerDurationFrom', from);
      });
    }
    if (to) {
      await this.retry.try(async () => {
        await this.comboBox.set('dataFormatPickerDurationTo', to);
      });
    }
    if (decimalPlaces) {
      const decimalPlacesInput = await this.testSubjects.find('dataFormatPickerDurationDecimal');
      await decimalPlacesInput.type(decimalPlaces);
    }
  }

  /**
   * write template for aggregation row in the `option` tab
   *
   * @param template always should contain `{{value}}`
   * @example
   * await visualBuilder.enterSeriesTemplate('$ {{value}}') // add `$` symbol for value
   */
  public async enterSeriesTemplate(template: string) {
    const el = await this.testSubjects.find('tsvb_series_value');
    await el.clearValueWithKeyboard();
    await el.type(template);
  }

  public async enterOffsetSeries(value: string) {
    const el = await this.testSubjects.find('offsetTimeSeries');
    await el.clearValue();
    await el.type(value);
  }

  public async getRhythmChartLegendValue(nth = 0) {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = (
      await this.find.allByCssSelector(`.echLegendItem .echLegendItem__extra`, 20000)
    )[nth];
    await metricValue.moveMouseTo();
    return await metricValue.getVisibleText();
  }

  public async clickGauge() {
    await this.testSubjects.click('gaugeTsvbTypeBtn');
  }

  public async getGaugeLabel() {
    const gaugeLabel = await this.testSubjects.find('gaugeLabel');
    return await gaugeLabel.getVisibleText();
  }

  public async getGaugeCount() {
    const gaugeCount = await this.testSubjects.find('gaugeValue');
    return await gaugeCount.getVisibleText();
  }

  public async getGaugeColor(isInner = false): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const gaugeColoredCircle = await this.testSubjects.find(`gaugeCircle${isInner ? 'Inner' : ''}`);
    return await gaugeColoredCircle.getAttribute('stroke');
  }

  public async clickTopN() {
    await this.testSubjects.click('top_nTsvbTypeBtn');
  }

  public async getTopNLabel() {
    const topNLabel = await this.find.byCssSelector('.tvbVisTopN__label');
    return await topNLabel.getVisibleText();
  }

  public async getTopNCount() {
    const gaugeCount = await this.find.byCssSelector('.tvbVisTopN__value');
    return await gaugeCount.getVisibleText();
  }

  public async getTopNBarStyle(nth: number = 0): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const topNBars = await this.testSubjects.findAll('topNInnerBar');
    return await topNBars[nth].getAttribute('style');
  }

  public async clickTable() {
    await this.testSubjects.click('tableTsvbTypeBtn');
  }

  public async createNewAgg(nth = 0) {
    const prevAggs = await this.testSubjects.findAll('aggSelector');
    const elements = await this.testSubjects.findAll('addMetricAddBtn');
    await elements[nth].click();
    await this.visChart.waitForVisualizationRenderingStabilized();
    await this.retry.waitFor('new agg is added', async () => {
      const currentAggs = await this.testSubjects.findAll('aggSelector');
      return currentAggs.length > prevAggs.length;
    });
  }

  public async selectAggType(value: string, nth = 0) {
    const elements = await this.testSubjects.findAll('aggSelector');
    await this.comboBox.setElement(elements[nth], value);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async fillInExpression(expression: string, nth = 0) {
    const expressions = await this.testSubjects.findAll('mathExpression');
    await expressions[nth].type(expression);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async fillInVariable(name = 'test', metric = 'Count', nth = 0) {
    const elements = await this.testSubjects.findAll('varRow');
    const varNameInput = await elements[nth].findByCssSelector('.tvbAggs__varName');
    await varNameInput.type(name);
    const metricSelectWrapper = await elements[nth].findByCssSelector('.tvbAggs__varMetricWrapper');
    await this.comboBox.setElement(metricSelectWrapper, metric);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async selectGroupByField(fieldName: string) {
    await this.comboBox.set('groupByField', fieldName);
  }

  public async setColumnLabelValue(value: string) {
    const el = await this.testSubjects.find('columnLabelName');
    await el.clearValue();
    await el.type(value);
    await this.header.waitUntilLoadingHasFinished();
  }

  /**
   * get values for rendered table
   *
   * **Note:** this work only for table visualization
   *
   * @returns {Promise<string>}
   * @memberof VisualBuilderPage
   */
  public async getViewTable(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const tableView = await this.testSubjects.find('tableView', 20000);
    return await tableView.getVisibleText();
  }

  private async switchTab(visType: string, tab: string) {
    const testSubj = `${visType}Editor${tab}Btn`;
    await this.retry.try(async () => {
      await this.testSubjects.click(testSubj);
      await this.header.waitUntilLoadingHasFinished();
      if (!(await (await this.testSubjects.find(testSubj)).elementHasClass('euiTab-isSelected'))) {
        throw new Error('tab not active');
      }
    });
  }

  public async clickPanelOptions(tabName: string) {
    await this.switchTab(tabName, 'PanelOptions');
  }

  public async clickDataTab(tabName: string) {
    await this.switchTab(tabName, 'Data');
  }

  public async clickAnnotationsTab() {
    await this.switchTab('timeSeries', 'Annotations');
  }

  public async clickAnnotationsAddDataSourceButton() {
    await this.testSubjects.click('addDataSourceButton');
  }

  public async setAnnotationFilter(query: string) {
    const annotationQueryBar = await this.testSubjects.find('annotationQueryBar');
    await annotationQueryBar.type(query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setAnnotationFields(fields: string) {
    const annotationFieldsInput = await this.testSubjects.find('annotationFieldsInput');
    await annotationFieldsInput.type(fields);
  }

  public async setAnnotationRowTemplate(template: string) {
    const annotationRowTemplateInput = await this.testSubjects.find('annotationRowTemplateInput');
    await annotationRowTemplateInput.type(template);
  }

  public async toggleIndexPatternSelectionModePopover(shouldOpen: boolean) {
    await this.retry.try(async () => {
      const isPopoverOpened = await this.testSubjects.exists(
        'switchIndexPatternSelectionModePopoverContent'
      );
      if ((shouldOpen && !isPopoverOpened) || (!shouldOpen && isPopoverOpened)) {
        await this.testSubjects.click('switchIndexPatternSelectionModePopoverButton');
      }
      if (shouldOpen) {
        await this.testSubjects.existOrFail('switchIndexPatternSelectionModePopoverContent');
      } else {
        await this.testSubjects.missingOrFail('switchIndexPatternSelectionModePopoverContent');
      }
    });
  }

  public async switchIndexPatternSelectionMode(useKibanaIndices: boolean) {
    await this.toggleIndexPatternSelectionModePopover(true);
    await this.testSubjects.setEuiSwitch(
      'switchIndexPatternSelectionMode',
      useKibanaIndices ? 'check' : 'uncheck'
    );
    await this.toggleIndexPatternSelectionModePopover(false);
  }

  public async checkIndexPatternSelectionModeSwitchIsEnabled() {
    await this.toggleIndexPatternSelectionModePopover(true);
    let isEnabled;
    await this.testSubjects.retry.tryForTime(2000, async () => {
      isEnabled = await this.testSubjects.isEnabled('switchIndexPatternSelectionMode');
    });
    await this.toggleIndexPatternSelectionModePopover(false);
    return isEnabled;
  }

  public async setIndexPatternValue(value: string, useKibanaIndices?: boolean) {
    const metricsIndexPatternInput = 'metricsIndexPatternInput';

    if (useKibanaIndices !== undefined) {
      await this.retry.try(async () => {
        await this.switchIndexPatternSelectionMode(useKibanaIndices);
      });
    }

    if (useKibanaIndices === false) {
      const el = await this.testSubjects.find(metricsIndexPatternInput);
      el.focus();
      await el.clearValue();
      if (value) {
        await el.type(value, { charByChar: true });
      }
    } else {
      await this.comboBox.clearInputField(metricsIndexPatternInput);
      if (value) {
        await this.comboBox.setCustom(metricsIndexPatternInput, value);
      }
    }

    await this.header.waitUntilLoadingHasFinished();
  }

  public async setIntervalValue(value: string) {
    const el = await this.testSubjects.find('metricsIndexPatternInterval');
    await el.clearValueWithKeyboard();
    await el.type(value);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setDropLastBucket(value: boolean) {
    const option = await this.testSubjects.find(`metricsDropLastBucket-${value ? 'yes' : 'no'}`);
    (await option.findByCssSelector('label')).click();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setOverrideIndexPattern(value: boolean) {
    const option = await this.testSubjects.find(
      `seriesOverrideIndexPattern-${value ? 'yes' : 'no'}`
    );
    (await option.findByCssSelector('label')).click();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async waitForIndexPatternTimeFieldOptionsLoaded() {
    await this.retry.waitFor('combobox options loaded', async () => {
      const options = await this.comboBox.getOptions('metricsIndexPatternFieldsSelect');
      this.log.debug(`-- optionsCount=${options.length}`);
      return options.length > 0;
    });
  }

  public async selectIndexPatternTimeField(timeField: string) {
    await this.retry.try(async () => {
      await this.comboBox.clearInputField('metricsIndexPatternFieldsSelect');
      await this.comboBox.set('metricsIndexPatternFieldsSelect', timeField);
    });
  }

  /**
   * check that table visualization is visible and ready for interact
   *
   * @returns {Promise<void>}
   * @memberof VisualBuilderPage
   */
  public async checkTableTabIsPresent(): Promise<void> {
    await this.testSubjects.existOrFail('visualizationLoader');
    const isDataExists = await this.testSubjects.exists('tableView');
    this.log.debug(`data is already rendered: ${isDataExists}`);
    if (!isDataExists) {
      await this.checkPreviewIsDisabled();
    }
  }

  /**
   * set label name for aggregation
   *
   * @param {string} labelName
   * @param {number} [nth=0]
   * @memberof VisualBuilderPage
   */
  public async setLabel(labelName: string, nth: number = 0): Promise<void> {
    const input = (await this.find.allByCssSelector('[placeholder="Label"]'))[nth];
    await input.type(labelName);
  }

  /**
   * set field for type of aggregation
   *
   * @param {string} field name of field
   * @param {number} [aggNth=0] number of aggregation. Start by zero
   * @default 0
   * @memberof VisualBuilderPage
   */
  public async setFieldForAggregation(field: string, aggNth: number = 0): Promise<void> {
    const fieldEl = await this.getFieldForAggregation(aggNth);

    await this.comboBox.setElement(fieldEl, field);
  }

  public async checkFieldForAggregationValidity(aggNth: number = 0): Promise<boolean> {
    const fieldEl = await this.getFieldForAggregation(aggNth);

    return await this.comboBox.checkValidity(fieldEl);
  }

  public async getFieldForAggregation(aggNth: number = 0): Promise<WebElementWrapper> {
    const labels = await this.testSubjects.findAll('aggRow');
    const label = labels[aggNth];

    return (await label.findAllByTestSubject('comboBoxInput'))[1];
  }

  public async clickColorPicker(nth: number = 0): Promise<void> {
    const picker = (await this.find.allByCssSelector('.tvbColorPicker button'))[nth];
    await picker.clickMouseButton();
  }

  public async setBackgroundColor(colorHex: string): Promise<void> {
    await this.clickColorPicker();
    await this.checkColorPickerPopUpIsPresent();
    await this.testSubjects.setValue('euiColorPickerInput_top', colorHex, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await this.clickColorPicker();
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  public async checkColorPickerPopUpIsPresent(): Promise<void> {
    this.log.debug(`Check color picker popup is present`);
    await this.testSubjects.existOrFail('euiColorPickerPopover', { timeout: 5000 });
  }

  public async setColorPickerValue(colorHex: string, nth: number = 0): Promise<void> {
    await this.clickColorPicker(nth);
    await this.checkColorPickerPopUpIsPresent();
    await this.testSubjects.setValue('euiColorPickerInput_top', colorHex, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await this.clickColorPicker(nth);
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  public async setColorRuleOperator(condition: string): Promise<void> {
    await this.retry.try(async () => {
      await this.comboBox.clearInputField('colorRuleOperator');
      await this.comboBox.set('colorRuleOperator', condition);
    });
  }

  public async setColorRuleValue(value: number): Promise<void> {
    await this.retry.try(async () => {
      const colorRuleValueInput = await this.find.byCssSelector(
        '[data-test-subj="colorRuleValue"]'
      );
      await colorRuleValueInput.type(value.toString());
    });
  }

  public async getBackgroundStyle(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const visualization = await this.find.byClassName('tvbVis');
    return await visualization.getAttribute('style');
  }

  public async getMetricValueStyle(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.testSubjects.find('tsvbMetricValue');
    return await metricValue.getAttribute('style');
  }

  public async getGaugeValueStyle(): Promise<string> {
    await this.visChart.waitForVisualizationRenderingStabilized();
    const metricValue = await this.testSubjects.find('gaugeValue');
    return await metricValue.getAttribute('style');
  }

  public async changePanelPreview(nth: number = 0): Promise<void> {
    const prevRenderingCount = await this.visChart.getVisualizationRenderingCount();
    const changePreviewBtnArray = await this.testSubjects.findAll('AddActivatePanelBtn');
    await changePreviewBtnArray[nth].click();
    await this.visChart.waitForRenderingCount(prevRenderingCount + 1);
  }

  public async checkPreviewIsDisabled(): Promise<void> {
    this.log.debug(`Check no data message is present`);
    await this.testSubjects.existOrFail('visualization-error', { timeout: 5000 });
  }

  public async cloneSeries(nth: number = 0): Promise<void> {
    const cloneBtnArray = await this.testSubjects.findAll('AddCloneBtn');
    await cloneBtnArray[nth].click();
    await this.visChart.waitForVisualizationRenderingStabilized();
  }

  /**
   * Get aggregation count for the current series
   *
   * @param {number} [nth=0] series
   * @returns {Promise<number>}
   * @memberof VisualBuilderPage
   */
  public async getAggregationCount(nth: number = 0): Promise<number> {
    const series = await this.getSeries();
    const aggregation = await series[nth].findAllByTestSubject('draggable');
    return aggregation.length;
  }

  public async deleteSeries(nth: number = 0): Promise<void> {
    const prevRenderingCount = await this.visChart.getVisualizationRenderingCount();
    const cloneBtnArray = await this.testSubjects.findAll('AddDeleteBtn');
    await cloneBtnArray[nth].click();
    await this.visChart.waitForRenderingCount(prevRenderingCount + 1);
  }

  public async getLegendItems(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('.echLegendItem');
  }

  public async getLegendItemsContent(): Promise<string[]> {
    const legendList = await this.find.byCssSelector('.echLegendList');
    const $ = await legendList.parseDomContent();

    return $('li')
      .toArray()
      .map((li) => {
        const label = $(li).find('.echLegendItem__label').text();
        const value = $(li).find('.echLegendItem__extra').text();

        return `${label}: ${value}`;
      });
  }

  public async getSeries(): Promise<WebElementWrapper[]> {
    return await this.find.allByCssSelector('.tvbSeriesEditor');
  }

  public async setMetricsGroupBy(option: string) {
    const groupBy = await this.testSubjects.find('groupBySelect');
    await this.comboBox.setElement(groupBy, option, { clickWithMouse: true });
  }

  public async setMetricsGroupByTerms(
    field: string,
    filtering: { include?: string; exclude?: string } = {}
  ) {
    await this.setMetricsGroupBy('terms');
    await this.common.sleep(1000);
    const byField = await this.testSubjects.find('groupByField');
    await this.comboBox.setElement(byField, field);

    await this.setMetricsGroupByFiltering(filtering.include, filtering.exclude);
  }

  public async setAnotherGroupByTermsField(field: string) {
    const fieldSelectAddButtons = await this.testSubjects.findAll('fieldSelectItemAddBtn');
    await fieldSelectAddButtons[fieldSelectAddButtons.length - 1].click();
    await this.common.sleep(1000);
    const byFields = await this.testSubjects.findAll('fieldSelectItem');
    const selectedByField = byFields[byFields.length - 1];
    await this.comboBox.setElement(selectedByField, field);
  }

  public async setMetricsGroupByFiltering(include?: string, exclude?: string) {
    const setFilterValue = async (value: string | undefined, subjectKey: string) => {
      if (typeof value === 'string') {
        const valueSubject = await this.testSubjects.find(subjectKey);

        await valueSubject.clearValue();
        await valueSubject.type(value);
      }
    };

    await setFilterValue(include, 'groupByInclude');
    await setFilterValue(exclude, 'groupByExclude');
  }

  public async checkSelectedMetricsGroupByValue(value: string) {
    const groupBy = await this.testSubjects.find('groupBySelect');
    return await this.comboBox.isOptionSelected(groupBy, value);
  }

  public async addGroupByFilterRow() {
    const addButton = await this.testSubjects.find('filterRowAddBtn');
    await addButton.click();
  }

  public async setGroupByFilterQuery(query: string, nth: number = 0) {
    const filterQueryInput = await this.testSubjects.findAll('filterItemsQueryBar');
    await filterQueryInput[nth].type(query);
  }

  public async setGroupByFilterLabel(label: string, nth: number = 0) {
    const filterLabelInput = await this.testSubjects.findAll('filterItemsLabel');
    await filterLabelInput[nth].type(label);
  }

  public async setChartType(type: 'Bar' | 'Line', nth: number = 0) {
    const seriesChartTypeComboBoxes = await this.testSubjects.findAll('seriesChartTypeComboBox');
    return await this.comboBox.setElement(seriesChartTypeComboBoxes[nth], type);
  }

  public async setStackedType(stackedType: string, nth: number = 0) {
    const seriesChartTypeComboBoxes = await this.testSubjects.findAll('seriesStackedComboBox');
    return await this.comboBox.setElement(seriesChartTypeComboBoxes[nth], stackedType);
  }

  public async setSeriesFilter(query: string) {
    const seriesFilterQueryInput = await this.testSubjects.find('seriesConfigQueryBar');
    await seriesFilterQueryInput.type(query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setPanelFilter(query: string) {
    const panelFilterQueryInput = await this.testSubjects.find('panelFilterQueryBar');
    await panelFilterQueryInput.type(query);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async setMetricsDataTimerangeMode(value: string) {
    const dataTimeRangeMode = await this.testSubjects.find('dataTimeRangeMode');
    return await this.comboBox.setElement(dataTimeRangeMode, value);
  }

  public async checkSelectedDataTimerangeMode(value: string) {
    const dataTimeRangeMode = await this.testSubjects.find('dataTimeRangeMode');
    return await this.comboBox.isOptionSelected(dataTimeRangeMode, value);
  }

  public async setTopHitAggregateWithOption(option: string): Promise<void> {
    await this.comboBox.set('topHitAggregateWithComboBox', option);
  }

  public async setTopHitOrderByField(timeField: string) {
    await this.retry.try(async () => {
      await this.comboBox.clearInputField('topHitOrderByFieldSelect');
      await this.comboBox.set('topHitOrderByFieldSelect', timeField);
    });
  }

  public async setFilterRatioOption(optionType: 'Numerator' | 'Denominator', query: string) {
    const optionInput = await this.testSubjects.find(`filterRatio${optionType}Input`);
    await optionInput.type(query);
  }

  public async clickSeriesLegendItem(name: string) {
    await this.find.clickByCssSelector(`[data-ech-series-name="${name}"] .echLegendItem__label`);
  }

  public async toggleNewChartsLibraryWithDebug(enabled: boolean) {
    await this.elasticChart.setNewChartUiDebugFlag(enabled);
  }

  public async getChartDebugState(chartData?: DebugState) {
    return chartData ?? (await this.elasticChart.getChartDebugData())!;
  }

  public async getXAxisTitle(chartData?: DebugState, nth: number = 0) {
    const debugState = await this.getChartDebugState(chartData);
    return debugState?.axes?.x[nth]?.title;
  }

  public async getLegendNames(chartData?: DebugState) {
    const legendItems = (await this.getChartDebugState(chartData))?.legend?.items ?? [];
    return legendItems.map(({ name }) => name);
  }

  public async getChartItems(
    chartData?: DebugState,
    itemType: 'areas' | 'bars' | 'annotations' = 'areas'
  ) {
    await this.header.waitUntilLoadingHasFinished();
    return (await this.getChartDebugState(chartData))?.[itemType];
  }

  public async getAreaChartColors(chartData?: DebugState) {
    const areas = (await this.getChartItems(chartData)) as DebugState['areas'];
    return areas?.map(({ color }) => color);
  }

  public async getAreaChartData(chartData?: DebugState, nth: number = 0) {
    const areas = (await this.getChartItems(chartData)) as DebugState['areas'];
    return areas?.[nth]?.lines.y1.points.map(({ x, y }) => [x, y]);
  }

  public async getAnnotationsData(chartData?: DebugState) {
    const annotations = (await this.getChartItems(
      chartData,
      'annotations'
    )) as DebugState['annotations'];
    return annotations?.map(({ data }) => data);
  }

  public async getVisualizeError() {
    const visError = await this.testSubjects.find(`visualization-error`);
    const errorSpans = await visError.findAllByClassName('euiText--extraSmall');
    return await errorSpans[0].getVisibleText();
  }

  public async checkInvalidAggComponentIsPresent() {
    await this.testSubjects.existOrFail(`invalid_agg`);
  }
}
