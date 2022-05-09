/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

export class DashboardExpectService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly filterBar = this.ctx.getService('filterBar');

  private readonly dashboard = this.ctx.getPageObject('dashboard');
  private readonly visChart = this.ctx.getPageObject('visChart');
  private readonly tagCloud = this.ctx.getPageObject('tagCloud');
  private readonly findTimeout = 2500;

  async panelCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.panelCount(${expectedCount})`);
    await this.retry.try(async () => {
      const panelCount = await this.dashboard.getPanelCount();
      expect(panelCount).to.be(expectedCount);
    });
  }

  async visualizationsArePresent(vizList: string[]) {
    this.log.debug('Checking all visualisations are present on dashsboard');
    const notLoaded = await this.dashboard.getNotLoadedVisualizations(vizList);
    expect(notLoaded).to.be.empty();
  }

  async selectedLegendColorCount(color: string, expectedCount: number) {
    this.log.debug(`DashboardExpect.selectedLegendColorCount(${color}, ${expectedCount})`);
    await this.retry.try(async () => {
      const selectedLegendColor = await this.testSubjects.findAll(
        `legendSelectedColor-${color}`,
        this.findTimeout
      );
      expect(selectedLegendColor.length).to.be(expectedCount);
    });
  }

  async docTableFieldCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.docTableFieldCount(${expectedCount})`);
    await this.retry.try(async () => {
      const docTableCells = await this.testSubjects.findAll('docTableField', this.findTimeout);
      expect(docTableCells.length).to.be(expectedCount);
    });
  }

  async fieldSuggestions(expectedFields: string[]) {
    this.log.debug(`DashboardExpect.fieldSuggestions(${expectedFields})`);
    const fields = await this.filterBar.getFilterEditorFields();
    expectedFields.forEach((expectedField) => {
      expect(fields).to.contain(expectedField);
    });
  }

  async legendValuesToExist(legendValues: string[]) {
    this.log.debug(`DashboardExpect.legendValuesToExist(${legendValues})`);
    await Promise.all(
      legendValues.map(async (legend) => {
        await this.retry.try(async () => {
          const legendValueExists = await this.testSubjects.exists(`legend-${legend}`);
          expect(legendValueExists).to.be(true);
        });
      })
    );
  }

  async textWithinElementsExists(texts: string[], getElementsFn: Function) {
    this.log.debug(`DashboardExpect.textWithinElementsExists(${texts})`);
    await this.retry.try(async () => {
      const elements: WebElementWrapper[] = await getElementsFn();
      const elementTexts: string[] = [];
      await Promise.all(
        elements.map(async (element) => {
          elementTexts.push(await element.getVisibleText());
        })
      );
      this.log.debug(
        `Found ${elements.length} elements with values: ${JSON.stringify(elementTexts)}`
      );
      texts.forEach((value) => {
        const indexOfValue = elementTexts.indexOf(value);
        expect(indexOfValue).to.be.greaterThan(-1);
        elementTexts.splice(indexOfValue, 1);
      });
    });
  }

  async textWithinTestSubjectsExists(texts: string[], selector: string) {
    this.log.debug(`DashboardExpect.textWithinTestSubjectsExists(${texts})`);
    this.log.debug(`textWithinTestSubjectsExists:(${JSON.stringify(texts)},${selector})`);
    await this.textWithinElementsExists(
      texts,
      async () => await this.testSubjects.findAll(selector)
    );
  }

  async textWithinCssElementExists(texts: string[], selector: string) {
    this.log.debug(`DashboardExpect.textWithinCssElementExists(${texts})`);
    this.log.debug(`textWithinCssElementExists:(${JSON.stringify(texts)},${selector})`);
    await this.textWithinElementsExists(
      texts,
      async () => await this.find.allByCssSelector(selector)
    );
  }

  async textWithinElementsDoNotExist(texts: string[], getElementsFn: Function) {
    this.log.debug(`DashboardExpect.textWithinElementsDoNotExist(${texts})`);
    await this.retry.try(async () => {
      const elements: WebElementWrapper[] = await getElementsFn();
      const elementTexts: string[] = [];
      await Promise.all(
        elements.map(async (element) => {
          elementTexts.push(await element.getVisibleText());
        })
      );
      this.log.debug(
        `Found ${elements.length} elements with values: ${JSON.stringify(elementTexts)}`
      );
      texts.forEach((value) => {
        const indexOfValue = elementTexts.indexOf(value);
        expect(indexOfValue).to.be(-1);
      });
    });
  }

  async textWithinCssElementDoNotExist(texts: string[], selector: string) {
    this.log.debug(`textWithinCssElementExists:(${JSON.stringify(texts)},${selector})`);
    await this.textWithinElementsDoNotExist(
      texts,
      async () => await this.find.allByCssSelector(selector)
    );
  }

  async timelionLegendCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.timelionLegendCount(${expectedCount})`);
    await this.retry.try(async () => {
      const flotLegendLabels = await this.testSubjects.findAll('flotLegendLabel', this.findTimeout);
      expect(flotLegendLabels.length).to.be(expectedCount);
    });
  }

  async emptyTagCloudFound() {
    this.log.debug(`DashboardExpect.emptyTagCloudFound()`);
    const tagCloudVisualizations = await this.testSubjects.findAll('tagCloudVisualization');
    if (tagCloudVisualizations.length > 0) {
      const tagCloudsHaveContent = await Promise.all(
        tagCloudVisualizations.map(async (tagCloud) => {
          return await this.find.descendantExistsByCssSelector('text', tagCloud);
        })
      );
      expect(tagCloudsHaveContent.indexOf(false)).to.be.greaterThan(-1);
    }
  }

  async tagCloudWithValuesFound(values: string[]) {
    this.log.debug(`DashboardExpect.tagCloudWithValuesFound(${values})`);
    const tagCloudVisualizations = await this.testSubjects.findAll('tagCloudVisualization');
    if (tagCloudVisualizations.length > 0) {
      const matches = await Promise.all(
        tagCloudVisualizations.map(async (tagCloud) => {
          const tagCloudData = await this.tagCloud.getTextTagByElement(tagCloud);
          for (let i = 0; i < values.length; i++) {
            const valueExists = tagCloudData.includes(values[i]);
            if (!valueExists) {
              return false;
            }
          }
          return true;
        })
      );
      expect(matches.indexOf(true)).to.be.greaterThan(-1);
    }
  }

  async goalAndGuageLabelsExist(labels: string[]) {
    this.log.debug(`DashboardExpect.goalAndGuageLabelsExist(${labels})`);
    await this.textWithinCssElementExists(labels, '.chart-label');
  }

  async metricValuesExist(values: string[]) {
    this.log.debug(`DashboardExpect.metricValuesExist(${values})`);
    await this.textWithinCssElementExists(values, '.mtrVis__value');
  }

  async tsvbMetricValuesExist(values: string[]) {
    this.log.debug(`DashboardExpect.tsvbMetricValuesExist(${values})`);
    await this.textWithinTestSubjectsExists(values, 'tsvbMetricValue');
  }

  async tsvbTopNValuesExist(values: string[]) {
    this.log.debug(`DashboardExpect.tsvbTopNValuesExist(${values})`);
    await this.textWithinTestSubjectsExists(values, 'tsvbTopNValue');
  }

  async vegaTextsExist(values: string[]) {
    this.log.debug(`DashboardExpect.vegaTextsExist(${values})`);
    await this.textWithinCssElementExists(values, '.vgaVis__view text');
  }

  async vegaTextsDoNotExist(values: string[]) {
    this.log.debug(`DashboardExpect.vegaTextsDoNotExist(${values})`);
    await this.textWithinCssElementDoNotExist(values, '.vgaVis__view text');
  }

  async tsvbMarkdownWithValuesExists(values: string[]) {
    this.log.debug(`DashboardExpect.tsvbMarkdownWithValuesExists(${values})`);
    await this.textWithinTestSubjectsExists(values, 'tsvbMarkdown');
  }

  async markdownWithValuesExists(values: string[]) {
    this.log.debug(`DashboardExpect.markdownWithValuesExists(${values})`);
    await this.textWithinTestSubjectsExists(values, 'markdownBody');
  }

  async savedSearchRowCount(expectedMinCount: number) {
    this.log.debug(`DashboardExpect.savedSearchRowCount(${expectedMinCount})`);
    await this.retry.try(async () => {
      const gridExists = await this.find.existsByCssSelector('[data-document-number]');
      if (gridExists) {
        const grid = await this.find.byCssSelector('[data-document-number]');
        // in this case it's the document explorer
        const docNr = Number(await grid.getAttribute('data-document-number'));
        expect(docNr).to.be.above(expectedMinCount);
      } else {
        // in this case it's the classic table
        const savedSearchRows = await this.testSubjects.findAll(
          'docTableExpandToggleColumn',
          this.findTimeout
        );
        expect(savedSearchRows.length).to.be.above(expectedMinCount);
      }
    });
  }

  async savedSearchNoResult() {
    const savedSearchTable = await this.testSubjects.find('embeddedSavedSearchDocTable');
    const resultStr = await savedSearchTable.getVisibleText();
    expect(resultStr).to.be('No results found');
  }

  async savedSearchRowsExist() {
    this.testSubjects.existOrFail('docTableExpandToggleColumn');
  }

  async savedSearchRowsMissing() {
    this.testSubjects.missingOrFail('docTableExpandToggleColumn');
  }

  async dataTableRowCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.dataTableRowCount(${expectedCount})`);
    await this.retry.try(async () => {
      const dataTableRows = await this.visChart.getTableVisContent();
      expect(dataTableRows.length).to.be(expectedCount);
    });
  }

  async dataTableNoResult() {
    this.log.debug(`DashboardExpect.dataTableNoResult`);
    await this.retry.try(async () => {
      await this.visChart.getTableVisNoResult();
    });
  }

  async seriesElementCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.seriesElementCount(${expectedCount})`);
    await this.retry.try(async () => {
      const seriesElements = await this.find.allByCssSelector('.series', this.findTimeout);
      expect(seriesElements.length).to.be(expectedCount);
    });
  }

  async inputControlItemCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.inputControlItemCount(${expectedCount})`);
    await this.retry.try(async () => {
      const inputControlItems = await this.testSubjects.findAll('inputControlItem');
      expect(inputControlItems.length).to.be(expectedCount);
    });
  }

  async lineChartPointsCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.lineChartPointsCount(${expectedCount})`);
    await this.retry.try(async () => {
      const points = await this.find.allByCssSelector('.points', this.findTimeout);
      expect(points.length).to.be(expectedCount);
    });
  }

  async tsvbTableCellCount(expectedCount: number) {
    this.log.debug(`DashboardExpect.tsvbTableCellCount(${expectedCount})`);
    await this.retry.try(async () => {
      const tableCells = await this.testSubjects.findAll('tvbTableVis__value', this.findTimeout);
      expect(tableCells.length).to.be(expectedCount);
    });
  }
}
