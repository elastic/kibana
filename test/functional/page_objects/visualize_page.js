import { VisualizeConstants } from '../../../src/core_plugins/kibana/public/visualize/visualize_constants';
import Keys from 'leadfoot/keys';

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
    }

    async clickDataTable() {
      await find.clickByPartialLinkText('Data Table');
    }

    async clickLineChart() {
      await find.clickByPartialLinkText('Line');
    }

    async clickRegionMap() {
      await find.clickByPartialLinkText('Region Map');
    }

    async clickMarkdownWidget() {
      await find.clickByPartialLinkText('Markdown');
    }

    async clickAddMetric() {
      await find.clickByCssSelector('[group-name="metrics"] [data-test-subj="visualizeEditorAddAggregationButton"]');
    }

    async clickMetric() {
      await find.clickByPartialLinkText('Metric');
    }

    async clickGauge() {
      await find.clickByPartialLinkText('Gauge');
    }

    async clickPieChart() {
      await find.clickByPartialLinkText('Pie');
    }

    async clickTileMap() {
      await find.clickByPartialLinkText('Coordinate Map');
    }

    async clickTagCloud() {
      await find.clickByPartialLinkText('Tag Cloud');
    }

    async clickVisualBuilder() {
      await find.clickByPartialLinkText('Visual Builder');
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
    }

    async clickHeatmapChart() {
      await find.clickByPartialLinkText('Heat Map');
    }

    async clickInputControlVis() {
      await find.clickByPartialLinkText('Controls');
    }

    async getChartTypeCount() {
      const tags = await find.allByCssSelector('a.wizard-vis-type.ng-scope');
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
      const stillOpen = await find.existsByCssSelector('.Select-menu-outer', 0);
      if (stillOpen) {
        await find.clickByCssSelector(className + ' * .Select-arrow-zone');
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

    async clickGoButton() {
      await testSubjects.click('timepickerGoButton');
    }

    async getSpyToggleExists() {
      return await testSubjects.exists('spyToggleButton');
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
        async () => await find.allByCssSelector('li.list-group-item.list-group-menu-item.ng-binding.ng-scope'));
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
        'select.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-required[ng-model="agg.params.orderBy"] ' +
          'option.ng-binding.ng-scope:contains("' + fieldValue + '")');
    }

    async selectOrderBy(fieldValue) {
      await find.clickByCssSelector('select[name="orderBy"] > option[value="' + fieldValue + '"]');
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

      return await PageObjects.header.getToastMessage();
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
    async getAreaChartData(aggregateName) {
      // 1). get the maximim chart Y-Axis marker value
      const maxChartYAxisElement = await retry.try(
        async () => await find.byCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type'));

      const yLabel = await maxChartYAxisElement.getVisibleText();
      // since we're going to use the y-axis 'last' (top) label as a number to
      // scale the chart pixel data, we need to clean out commas and % marks.
      const yAxisLabel = yLabel.replace(/(%|,)/g, '');
      log.debug('yAxisLabel = ' + yAxisLabel);

      const rectangle = await find.byCssSelector('rect.background');
      const yAxisHeight = await rectangle.getAttribute('height');
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () => await find.byCssSelector(`path[data-label="${aggregateName}"]`, defaultFindTimeout * 2));
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      const tempArray = data.replace('M', '').split('L');
      const chartSections = tempArray.length / 2;
      log.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
      const chartData = [];
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) / yAxisHeight * yAxisLabel);
        log.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    }

    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    async getLineChartData(cssPart, axis = 'ValueAxis-1') {
      // 1). get the maximim chart Y-Axis marker value
      const maxYAxisMarker = await retry.try(
        async () => await find.byCssSelector(`div.y-axis-div-wrapper > div > svg > g.${axis} > g:last-of-type`));
      const yLabel = await maxYAxisMarker.getVisibleText();
      const yAxisLabel = yLabel.replace(/,/g, '');

      // 2). find and save the y-axis pixel size (the chart height)
      const rectangle = await find.byCssSelector('clipPath rect');
      const theHeight = await rectangle.getAttribute('height');
      const yAxisHeight = theHeight;
      log.debug('theHeight = ' + theHeight);

      // 3). get the chart-wrapper elements
      const chartTypes = await retry.try(
        async () => await find.allByCssSelector(`.chart-wrapper circle[${cssPart}]`, defaultFindTimeout * 2));

      // 5). for each chart element, find the green circle, then the cy position
      async function getChartType(chart) {
        const cy = await chart.getAttribute('cy');
        return Math.round((yAxisHeight - cy) / yAxisHeight * yAxisLabel);
      }

      // 4). pass the chartTypes to the getChartType function
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }

    // this is ALMOST identical to DiscoverPage.getBarChartData
    async getBarChartData() {
      // 1). get the maximim chart Y-Axis marker value
      const maxYAxisChartMarker = await retry.try(
        async () => await find.byCssSelector('div.y-axis-div-wrapper > div > svg > g > g:last-of-type'));

      const yLabel = await maxYAxisChartMarker.getVisibleText();
      const yAxisLabel = yLabel.replace(',', '');
      log.debug('yAxisLabel = ' + yAxisLabel);

      // 2). find and save the y-axis pixel size (the chart height)
      const chartAreaObj = await find.byCssSelector('rect.background');
      const yAxisHeight = await chartAreaObj.getAttribute('height');

      // 3). get the chart-wrapper elements
      const chartTypes = await find.allByCssSelector('svg > g > g.series > rect');
      async function getChartType(chart) {
        const fillColor = await chart.getAttribute('fill');

        // we're getting the default count color from defaults.js
        if (fillColor === '#00a69b') {
          const barHeight = await chart.getAttribute('height');
          return Math.round(barHeight / yAxisHeight * yAxisLabel);
        }
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
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
      const markdown = await retry.try(async () => find.byCssSelector('visualize.ng-isolate-scope'));
      return await markdown.getVisibleText();
    }

    async clickColumns() {
      await find.clickByCssSelector('div.schemaEditors.ng-scope > div > div > button:nth-child(2)');
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
  }

  return new VisualizePage();
}
