import { VisualizeConstants } from '../../../src/core_plugins/kibana/public/visualize/visualize_constants';
import Keys from 'leadfoot/keys';
import Bluebird from 'bluebird';

export function VisualizePageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const defaultFindTimeout = config.get('timeouts.find');

  class VisualizePage {

    async waitForVisualizationSelectPage() {
      await testSubjects.find('visualizeSelectTypePage');
    }

    async clickAreaChart() {
      await find.clickByPartialLinkText('Area');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickDataTable() {
      await find.clickByPartialLinkText('Data Table');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickLineChart() {
      await find.clickByPartialLinkText('Line');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickRegionMap() {
      await find.clickByPartialLinkText('Region Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMarkdownWidget() {
      await find.clickByPartialLinkText('Markdown');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickAddMetric() {
      await find.clickByCssSelector('[group-name="metrics"] [data-test-subj="visualizeEditorAddAggregationButton"]');
    }

    async clickAddBucket() {
      await find.clickByCssSelector('[group-name="buckets"] [data-test-subj="visualizeEditorAddAggregationButton"]');
    }

    async clickMetric() {
      await find.clickByPartialLinkText('Metric');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickGauge() {
      await find.clickByPartialLinkText('Gauge');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickPieChart() {
      await find.clickByPartialLinkText('Pie');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTileMap() {
      await find.clickByPartialLinkText('Coordinate Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickTagCloud() {
      await find.clickByPartialLinkText('Tag Cloud');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVega() {
      await find.clickByPartialLinkText('Vega');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualBuilder() {
      await find.clickByPartialLinkText('Visual Builder');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickEditorSidebarCollapse() {
      await testSubjects.click('collapseSideBarButton');
    }

    async selectTagCloudTag(tagDisplayText) {
      await testSubjects.click(tagDisplayText);
    }

    async getTextTag() {
      const elements = await find.allByCssSelector('text');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async getTextSizes() {
      const tags = await find.allByCssSelector('text');
      async function returnTagSize(tag) {
        const style = await tag.getAttribute('style');
        return style.match(/font-size: ([^;]*);/)[1];
      }
      return await Promise.all(tags.map(returnTagSize));
    }

    async clickVerticalBarChart() {
      await find.clickByPartialLinkText('Vertical Bar');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickHeatmapChart() {
      await find.clickByPartialLinkText('Heat Map');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickInputControlVis() {
      await find.clickByPartialLinkText('Controls');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getChartTypeCount() {
      const tags = await find.allByCssSelector('a.wizard-vis-type');
      return tags.length;
    }

    async getChartTypes() {
      const chartTypes = await testSubjects.findAll('visualizeWizardChartTypeTitle');
      async function getChartType(chart) {
        return await chart.getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async selectVisSourceIfRequired() {
      log.debug('selectVisSourceIfRequired');
      const selectPage = await testSubjects.findAll('visualizeSelectSearch');
      if (selectPage.length) {
        log.debug('a search is required for this visualization');
        await this.clickNewSearch();
      }
    }

    async getLabTypeLinks() {
      return await remote.findAllByPartialLinkText('(Lab)');
    }

    async getExperimentalTypeLinks() {
      return await remote.findAllByPartialLinkText('(Experimental)');
    }

    async isExperimentalInfoShown() {
      return await testSubjects.exists('experimentalVisInfo');
    }

    async getExperimentalInfo() {
      return await testSubjects.find('experimentalVisInfo');
    }

    async clickAbsoluteButton() {
      await find.clickByCssSelector(
        'ul.nav.nav-pills.nav-stacked.kbn-timepicker-modes:contains("absolute")',
        defaultFindTimeout * 2);
    }

    async setMarkdownTxt(markdownTxt) {
      const input = await testSubjects.find('markdownTextarea');
      await input.clearValue();
      await input.type(markdownTxt);
    }

    async getMarkdownText() {
      const markdownContainer = await testSubjects.find('markdownBody');
      return markdownContainer.getVisibleText();
    }

    async getMarkdownBodyDescendentText(selector) {
      const markdownContainer = await testSubjects.find('markdownBody');
      const element = await find.descendantDisplayedByCssSelector(selector, markdownContainer);
      return element.getVisibleText();
    }

    async getVegaSpec() {
      // Adapted from console_page.js:getVisibleTextFromAceEditor(). Is there a common utilities file?
      const editor = await testSubjects.find('vega-editor');
      const lines = await editor.findAllByClassName('ace_line_group');
      const linesText = await Bluebird.map(lines, l => l.getVisibleText());
      return linesText.join('\n');
    }

    async getVegaViewContainer() {
      return await find.byCssSelector('div.vega-view-container');
    }

    async getVegaControlContainer() {
      return await find.byCssSelector('div.vega-controls-container');
    }

    async setFromTime(timeString) {
      const input = await find.byCssSelector('input[ng-model="absolute.from"]', defaultFindTimeout * 2);
      await input.clearValue();
      await input.type(timeString);
    }

    async setToTime(timeString) {
      const input = await find.byCssSelector('input[ng-model="absolute.to"]', defaultFindTimeout * 2);
      await input.clearValue();
      await input.type(timeString);
    }

    async setReactSelect(className, value) {
      const input = await find.byCssSelector(className + ' * input', 0);
      await input.clearValue();
      await input.type(value);
      await find.clickByCssSelector('.Select-option');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const stillOpen = await find.existsByCssSelector('.Select-menu-outer', 0);
      if (stillOpen) {
        await find.clickByCssSelector(className + ' * .Select-arrow-zone');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    }

    async clearReactSelect(className) {
      await find.clickByCssSelector(className + ' * .Select-clear-zone');
    }

    async getReactSelectOptions(containerSelector) {
      await testSubjects.click(containerSelector);
      const menu = await retry.try(
        async () => find.byCssSelector('.Select-menu-outer'));
      return await menu.getVisibleText();
    }

    async doesReactSelectHaveValue(className) {
      return await find.existsByCssSelector(className + ' * .Select-value-label', 0);
    }

    async getReactSelectValue(className) {
      const hasValue = await this.doesReactSelectHaveValue(className);
      if (!hasValue) {
        return '';
      }

      const valueElement = await retry.try(
        async () => find.byCssSelector(className + ' * .Select-value-label'));
      return await valueElement.getVisibleText();
    }

    async addInputControl() {
      await testSubjects.click('inputControlEditorAddBtn');
    }

    async checkCheckbox(selector) {
      const element = await testSubjects.find(selector);
      const isSelected = await element.isSelected();
      if(!isSelected) {
        log.debug(`checking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async uncheckCheckbox(selector) {
      const element = await testSubjects.find(selector);
      const isSelected = await element.isSelected();
      if(isSelected) {
        log.debug(`unchecking checkbox ${selector}`);
        await testSubjects.click(selector);
      }
    }

    async setSelectByOptionText(selectId, optionText) {
      const options = await find.allByCssSelector(`#${selectId} > option`);
      const optionsTextPromises = options.map(async (optionElement) => {
        return await optionElement.getVisibleText();
      });
      const optionsText = await Promise.all(optionsTextPromises);

      const optionIndex = optionsText.indexOf(optionText);
      if (optionIndex === -1) {
        throw new Error(`Unable to find option '${optionText}' in select ${selectId}. Available options: ${optionsText.join(',')}`);
      }
      await options[optionIndex].click();
    }

    async getSpyToggleExists() {
      return await testSubjects.exists('spyToggleButton');
    }

    async getSideEditorExists() {
      return await find.existsByCssSelector('.collapsible-sidebar');
    }

    async openSpyPanel() {
      log.debug('openSpyPanel');
      const isOpen = await testSubjects.exists('spyContentContainer');
      if (!isOpen) {
        await retry.try(async () => {
          await this.toggleSpyPanel();
          await testSubjects.find('spyContentContainer');
        });
      }
    }

    async closeSpyPanel() {
      log.debug('closeSpyPanel');
      let isOpen = await testSubjects.exists('spyContentContainer');
      if (isOpen) {
        await retry.try(async () => {
          await this.toggleSpyPanel();
          isOpen = await testSubjects.exists('spyContentContainer');
          if (isOpen) {
            throw new Error('Failed to close spy panel');
          }
        });
      }
    }

    async toggleSpyPanel() {
      await testSubjects.click('spyToggleButton');
    }

    async setSpyPanelPageSize(size) {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`[data-test-subj="paginateControlsPageSizeSelect"] option[label="${size}"]`)
        .click();
    }

    async getMetric() {
      const metricElement = await find.byCssSelector('div[ng-controller="KbnMetricVisController"]');
      return await metricElement.getVisibleText();
    }

    async getGaugeValue() {
      const elements = await find.allByCssSelector('visualize .chart svg');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async clickMetricEditor() {
      await find.clickByCssSelector('button[data-test-subj="toggleEditor"]');
    }

    async clickNewSearch(indexPattern = 'logstash-*') {
      await testSubjects.click(`paginatedListItem-${indexPattern}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSavedSearch(savedSearchName) {
      await find.clickByPartialLinkText(savedSearchName);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setValue(newValue) {
      await find.clickByCssSelector('button[ng-click="numberListCntr.add()"]', defaultFindTimeout * 2);
      const input = await find.byCssSelector('input[ng-model="numberListCntr.getList()[$index]"]');
      await input.clearValue();
      await input.type(newValue);
    }

    async selectSearch(searchName) {
      await find.clickByLinkText(searchName);
    }

    async getErrorMessage() {
      const element = await find.byCssSelector('.item>h4');
      return await element.getVisibleText();
    }

    // clickBucket(bucketType) 'X-Axis', 'Split Area', 'Split Chart'
    async clickBucket(bucketName) {
      const chartTypes = await retry.try(
        async () => await find.allByCssSelector('li.list-group-item.list-group-menu-item'));
      log.debug('found bucket types ' + chartTypes.length);

      async function getChartType(chart) {
        const chartString = await chart.getVisibleText();
        if (chartString === bucketName) {
          await chart.click();
        }
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      await Promise.all(getChartTypesPromises);
    }

    async selectAggregation(myString, groupName = 'buckets') {
      const selector = `[group-name="${groupName}"] vis-editor-agg-params:not(.ng-hide) .agg-select`;
      await retry.try(async () => {
        await find.clickByCssSelector(selector);
        const input = await find.byCssSelector(`${selector} input.ui-select-search`);
        await input.type(myString);
        await remote.pressKeys('\uE006');
      });
    }

    async toggleOpenEditor(index) {
      // index, see selectYAxisAggregation
      const toggle = await find.byCssSelector(`button[aria-controls="visAggEditorParams${index}"]`);
      const toggleOpen = await toggle.getAttribute('aria-expanded');
      log.debug(`toggle ${index} expand = ${toggleOpen}`);
      if (toggleOpen === 'false') {
        log.debug(`toggle ${index} click()`);
        await toggle.click();
      }
    }

    async selectYAxisAggregation(agg, field, label, index = 1) {
      // index starts on the first "count" metric at 1
      // Each new metric or aggregation added to a visualization gets the next index.
      // So to modify a metric or aggregation tests need to keep track of the
      // order they are added.
      await this.toggleOpenEditor(index);
      const aggSelect = await find
        .byCssSelector(`#visAggEditorParams${index} div [data-test-subj="visEditorAggSelect"] div span[aria-label="Select box activate"]`);
      // open agg selection list
      await aggSelect.click();
      // select our agg
      const aggItem = await find.byCssSelector(`[data-test-subj="${agg}"]`);
      await aggItem.click();
      const fieldSelect = await find
        .byCssSelector(`#visAggEditorParams${index} > [agg-param="agg.type.params[0]"] > div > div > div.ui-select-match > span`);
      // open field selection list
      await fieldSelect.click();
      // select our field
      await testSubjects.click(field);
      // enter custom label
      await this.setCustomLabel(label, index);
    }

    async setCustomLabel(label, index = 1) {
      const customLabel = await find.byCssSelector(`#visEditorStringInput${index}customLabel`);
      customLabel.type(label);
    }

    async setAxisExtents(min, max, axis = 'LeftAxis-1') {
      const axisOptions = await find.byCssSelector(`div[aria-label="Toggle ${axis} options"]`);
      const isOpen = await axisOptions.getAttribute('aria-expanded');
      if (isOpen === 'false') {
        log.debug(`click to open ${axis} options`);
        await axisOptions.click();
      }
      // it would be nice to get the correct axis by name like "LeftAxis-1"
      // instead of an incremented index, but this link isn't under the div above
      const advancedLink =
        await find.byCssSelector(`#axisOptionsValueAxis-1 .kuiSideBarOptionsLink .kuiSideBarOptionsLink__caret`);

      const advancedLinkState = await advancedLink.getAttribute('class');
      if (advancedLinkState.includes('fa-caret-right')) {
        await advancedLink.session.moveMouseTo(advancedLink);
        log.debug('click advancedLink');
        await advancedLink.click();
      }
      const checkbox = await find.byCssSelector('input[ng-model="axis.scale.setYExtents"]');
      const checkboxState = await checkbox.getAttribute('class');
      if (checkboxState.includes('ng-empty')) {
        await checkbox.session.moveMouseTo(checkbox);
        await checkbox.click();
      }
      const maxField = await find.byCssSelector('[ng-model="axis.scale.max"]');
      await maxField.type(max);
      const minField = await find.byCssSelector('[ng-model="axis.scale.min"]');
      await minField.type(min);

    }

    async getField() {
      const field = await retry.try(
        async () => await find.byCssSelector('.ng-valid-required[name="field"] .ui-select-match-text'));
      return await field.getVisibleText();
    }

    async selectField(fieldValue, groupName = 'buckets') {
      const selector = `[group-name="${groupName}"] vis-editor-agg-params:not(.ng-hide) .field-select`;
      await retry.try(async () => {
        await find.clickByCssSelector(selector);
        const input = await find.byCssSelector(`${selector} input.ui-select-search`);
        await input.type(fieldValue);
        await remote.pressKeys('\uE006');
      });
    }

    async selectFieldById(fieldValue, id) {
      await find.clickByCssSelector(`#${id} > option[label="${fieldValue}"]`);
    }

    async orderBy(fieldValue) {
      await find.clickByCssSelector(
        'select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"]'
        + `option:contains("${fieldValue}")`);
    }

    async selectOrderBy(fieldValue) {
      await find.clickByCssSelector(`select[name="orderBy"] > option[value="${fieldValue}"]`);
    }

    async getInterval() {
      const select = await find.byCssSelector('select[ng-model="agg.params.interval"]');
      const selectedIndex = await select.getProperty('selectedIndex');
      const intervalElement = await find.byCssSelector(
        `select[ng-model="agg.params.interval"] option:nth-child(${(selectedIndex + 1)})`);
      return await intervalElement.getProperty('label');
    }

    async setInterval(newValue) {
      const input = await find.byCssSelector('select[ng-model="agg.params.interval"]');
      await input.type(newValue);
    }

    async setNumericInterval(newValue) {
      const input = await find.byCssSelector('input[name="interval"]');
      await input.clearValue();
      await input.type(newValue + '');
    }

    async setSize(newValue) {
      const input = await find.byCssSelector('input[name="size"]');
      await input.clearValue();
      await input.type(newValue);
    }

    async toggleDisabledAgg(agg) {
      await testSubjects.click(`aggregationEditor${agg} disableAggregationBtn`);
    }

    async toggleOtherBucket() {
      return await find.clickByCssSelector('input[name="showOther"]');
    }

    async toggleMissingBucket() {
      return await find.clickByCssSelector('input[name="showMissing"]');
    }

    async clickGo() {
      await testSubjects.click('visualizeEditorRenderButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async toggleAutoMode() {
      await testSubjects.click('visualizeEditorAutoButton');
    }

    async sizeUpEditor() {
      await testSubjects.click('visualizeEditorResizer');
      await remote.pressKeys(Keys.ARROW_RIGHT);
    }

    async clickOptions() {
      await find.clickByPartialLinkText('Options');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMetricsAndAxes() {
      await testSubjects.click('visEditorTabadvanced');
    }

    async selectChartMode(mode) {
      const selector = await find.byCssSelector(`#seriesMode0 > option[label="${mode}"]`);
      await selector.click();
    }

    async clickData() {
      await testSubjects.click('visualizeEditDataLink');
    }

    async clickVisEditorTab(tabName) {
      await testSubjects.click('visEditorTab' + tabName);
    }

    async selectWMS() {
      await find.clickByCssSelector('input[name="wms.enabled"]');
    }

    async ensureSavePanelOpen() {
      log.debug('ensureSavePanelOpen');
      let isOpen = await testSubjects.exists('saveVisualizationButton');
      await retry.try(async () => {
        while (!isOpen) {
          await testSubjects.click('visualizeSaveButton');
          isOpen = await testSubjects.exists('saveVisualizationButton');
        }
      });
    }

    async saveVisualization(vizName) {
      await this.ensureSavePanelOpen();
      await testSubjects.setValue('visTitleInput', vizName);
      log.debug('click submit button');
      await testSubjects.click('saveVisualizationButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      return await testSubjects.exists('saveVisualizationSuccess');
    }

    async clickLoadSavedVisButton() {
      // TODO: Use a test subject selector once we rewrite breadcrumbs to accept each breadcrumb
      // element as a child instead of building the breadcrumbs dynamically.
      await find.clickByCssSelector('[href="#/visualize"]');
    }

    async filterVisByName(vizName) {
      const input = await find.byCssSelector('input[name="filter"]');
      await input.click();
      // can't uses dashes in saved visualizations when filtering
      // or extended character sets
      // https://github.com/elastic/kibana/issues/6300
      await input.type(vizName.replace('-', ' '));
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickVisualizationByName(vizName) {
      log.debug('clickVisualizationByLinkText(' + vizName + ')');

      return retry.try(function tryingForTime() {
        return remote
          .setFindTimeout(defaultFindTimeout)
          .findByPartialLinkText(vizName)
          .click();
      });
    }

    // this starts by clicking the Load Saved Viz button, not from the
    // bottom half of the "Create a new visualization      Step 1" page
    async loadSavedVisualization(vizName) {
      await this.clickLoadSavedVisButton();
      await this.openSavedVisualization(vizName);
    }

    async openSavedVisualization(vizName) {
      await this.clickVisualizationByName(vizName);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getXAxisLabels() {
      const chartTypes = await find.allByCssSelector('.x > g');
      async function getChartType(chart) {
        return await chart.getVisibleText();
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getYAxisLabels() {
      const chartTypes = await find.allByCssSelector('.y > g');
      const getChartTypesPromises = chartTypes.map(async chart => await chart.getVisibleText());
      return await Promise.all(getChartTypesPromises);
    }

    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    async getAreaChartData(dataLabel, axis = 'ValueAxis-1') {
      const yAxisRatio = await this.getChartYAxisRatio(axis);

      const rectangle = await find.byCssSelector('rect.background');
      const yAxisHeight = await rectangle.getAttribute('height');
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () => await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2));
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      const tempArray = data.replace('M', '').split('L');
      const chartSections = tempArray.length / 2;
      // log.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
      const chartData = [];
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) * yAxisRatio);
        log.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    }

    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    async getLineChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 2). find and save the y-axis pixel size (the chart height)
      const rectangle = await find.byCssSelector('clipPath rect');
      const yAxisHeight = await rectangle.getAttribute('height');
      // 3). get the chart-wrapper elements
      const chartTypes = await retry.try(
        async () => await find
          .allByCssSelector(`.chart-wrapper circle[data-label="${dataLabel}"][fill-opacity="1"]`, defaultFindTimeout * 2));

      // 5). for each chart element, find the green circle, then the cy position
      async function getChartType(chart) {
        const cy = await chart.getAttribute('cy');
        // the point_series_options test has data in the billions range and
        // getting 11 digits of precision with these calculations is very hard
        return Math.round(((yAxisHeight - cy) * yAxisRatio).toPrecision(6));
      }

      // 4). pass the chartTypes to the getChartType function
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    // this is ALMOST identical to DiscoverPage.getBarChartData
    async getBarChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 3). get the chart-wrapper elements
      const chartTypes = await find.allByCssSelector(`svg > g > g.series > rect[data-label="${dataLabel}"]`);

      async function getChartType(chart) {
        const barHeight = await chart.getAttribute('height');
        return Math.round(barHeight * yAxisRatio);
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }


    // Returns value per pixel
    async getChartYAxisRatio(axis = 'ValueAxis-1') {
      // 1). get the maximim chart Y-Axis marker value and Y position
      const maxYAxisChartMarker = await retry.try(
        async () => await find.byCssSelector(`div.y-axis-div-wrapper > div > svg > g.${axis} > g:last-of-type.tick`)
      );
      const maxYLabel = (await maxYAxisChartMarker.getVisibleText()).replace(/,/g, '');
      const maxYLabelYPosition = (await maxYAxisChartMarker.getPosition()).y;
      log.debug(`maxYLabel = ${maxYLabel}, maxYLabelYPosition = ${maxYLabelYPosition}`);

      // 2). get the minimum chart Y-Axis marker value and Y position
      const minYAxisChartMarker = await
        find.byCssSelector('div.y-axis-col.axis-wrapper-left  > div > div > svg:nth-child(2) > g > g:nth-child(1).tick');
      const minYLabel = (await minYAxisChartMarker.getVisibleText()).replace(',', '');
      const minYLabelYPosition = (await minYAxisChartMarker.getPosition()).y;
      return ((maxYLabel - minYLabel) / (minYLabelYPosition - maxYLabelYPosition));
    }


    async getHeatmapData() {
      const chartTypes = await retry.try(
        async () => await find.allByCssSelector('svg > g > g.series rect', defaultFindTimeout * 2));
      log.debug('rects=' + chartTypes);
      async function getChartType(chart) {
        return await chart.getAttribute('data-label');
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartData() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('d'));
      return await Promise.all(getChartTypesPromises);
    }

    async getPieChartLabels() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('data-label'));
      return await Promise.all(getChartTypesPromises);
    }

    async getChartAreaWidth() {
      const rect = await retry.try(async () => find.byCssSelector('clipPath rect'));
      return await rect.getAttribute('width');
    }

    async getChartAreaHeight() {
      const rect = await retry.try(async () => find.byCssSelector('clipPath rect'));
      return await rect.getAttribute('height');
    }

    async selectTableInSpyPaneSelect() {
      await testSubjects.click('spyModeSelect-table');
    }

    async getDataTableData() {
      const dataTable = await testSubjects.find('paginated-table-body');
      return await dataTable.getVisibleText();
    }

    async getDataTableHeaders() {
      const dataTableHeader = await retry.try(
        async () => testSubjects.find('paginated-table-header'));
      return await dataTableHeader.getVisibleText();
    }

    async toggleIsFilteredByCollarCheckbox() {
      await testSubjects.click('isFilteredByCollarCheckbox');
    }

    async getMarkdownData() {
      const markdown = await retry.try(async () => find.byCssSelector('visualize'));
      return await markdown.getVisibleText();
    }

    async clickColumns() {
      await find.clickByCssSelector('div.schemaEditors > div > div > button:nth-child(2)');
    }

    async waitForVisualization() {
      return await find.byCssSelector('visualization');
    }

    async getZoomSelectors(zoomSelector) {
      return await find.allByCssSelector(zoomSelector);
    }

    async clickMapButton(zoomSelector) {
      await retry.try(async () => {
        const zooms = await this.getZoomSelectors(zoomSelector);
        await Promise.all(zooms.map(async zoom => await zoom.click()));
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    }

    async getVisualizationRequest() {
      log.debug('getVisualizationRequest');
      await this.openSpyPanel();
      await testSubjects.click('spyModeSelect-request');
      return await testSubjects.getVisibleText('visualizationEsRequestBody');
    }

    async getMapBounds() {
      const request = await this.getVisualizationRequest();
      const requestObject = JSON.parse(request);
      return requestObject.aggs.filter_agg.filter.geo_bounding_box['geo.coordinates'];
    }

    async clickMapZoomIn() {
      await this.clickMapButton('a.leaflet-control-zoom-in');
    }

    async clickMapZoomOut() {
      await this.clickMapButton('a.leaflet-control-zoom-out');
    }

    async getMapZoomEnabled(zoomSelector) {
      const zooms = await this.getZoomSelectors(zoomSelector);
      const classAttributes = await Promise.all(zooms.map(async zoom => await zoom.getAttribute('class')));
      return !classAttributes.join('').includes('leaflet-disabled');
    }

    async zoomAllTheWayOut() {
      // we can tell we're at level 1 because zoom out is disabled
      return await retry.try(async () => {
        await this.clickMapZoomOut();
        const enabled = await this.getMapZoomOutEnabled();
        //should be able to zoom more as current config has 0 as min level.
        if (enabled) {
          throw new Error('Not fully zoomed out yet');
        }
      });
    }

    async getMapZoomInEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-in');
    }

    async getMapZoomOutEnabled() {
      return await this.getMapZoomEnabled('a.leaflet-control-zoom-out');
    }

    async clickMapFitDataBounds() {
      return await this.clickMapButton('a.fa-crop');
    }

    async clickLandingPageBreadcrumbLink() {
      log.debug('clickLandingPageBreadcrumbLink');
      await find.clickByCssSelector(`a[href="#${VisualizeConstants.LANDING_PAGE_PATH}"]`);
    }

    /**
     * Returns true if already on the landing page (that page doesn't have a link to itself).
     * @returns {Promise<boolean>}
     */
    async onLandingPage() {
      log.debug(`VisualizePage.onLandingPage`);
      const exists = await testSubjects.exists('visualizeLandingPage');
      return exists;
    }

    async gotoLandingPage() {
      log.debug('VisualizePage.gotoLandingPage');
      const onPage = await this.onLandingPage();
      if (!onPage) {
        await retry.try(async () => {
          await this.clickLandingPageBreadcrumbLink();
          const onLandingPage = await this.onLandingPage();
          if (!onLandingPage) throw new Error('Not on the landing page.');
        });
      }
    }

    async clickLegendOption(name) {
      await testSubjects.click(`legend-${name}`);
    }

    async selectNewLegendColorChoice(color) {
      await testSubjects.click(`legendSelectColor-${color}`);
    }

    async doesSelectedLegendColorExist(color) {
      return await testSubjects.exists(`legendSelectedColor-${color}`);
    }

    async getYAxisTitle() {
      const title = await find.byCssSelector('.y-axis-div .y-axis-title text');
      return await title.getVisibleText();
    }

    async selectBucketType(type) {
      const bucketType = await find.byCssSelector(`[data-test-subj="${type}"]`);
      return await bucketType.click();
    }

    async getPieSlice(name) {
      return await testSubjects.find(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getAllPieSlices(name) {
      return await testSubjects.findAll(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getPieSliceStyle(name) {
      log.debug(`VisualizePage.getPieSliceStyle(${name})`);
      const pieSlice = await this.getPieSlice(name);
      return await pieSlice.getAttribute('style');
    }

    async getAllPieSliceStyles(name) {
      log.debug(`VisualizePage.getAllPieSliceStyles(${name})`);
      const pieSlices = await this.getAllPieSlices(name);
      return await Promise.all(pieSlices.map(async pieSlice => await pieSlice.getAttribute('style')));
    }
  }

  return new VisualizePage();
}
