/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunk } from 'lodash';
import { Key } from 'selenium-webdriver';
import {
  BUTTON_TEST_SUBJ,
  INPUT_TEST_SUBJ,
  BUTTON_PREV_TEST_SUBJ,
  BUTTON_NEXT_TEST_SUBJ,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
} from '@kbn/data-grid-in-table-search';
import { WebElementWrapper, CustomCheerioStatic } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export interface TabbedGridData {
  columns: string[];
  rows: string[][];
}

interface SelectOptions {
  isAnchorRow?: boolean;
  rowIndex?: number;
  columnIndex?: number;
  renderMoreRows?: boolean;
}

export class DataGridService extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');

  async getDataGridTableData(): Promise<TabbedGridData> {
    const table = await this.find.byCssSelector('.euiDataGrid');
    const $ = await table.parseDomContent();

    const columns = this.getHeaderText($);
    const cells = $.findTestSubjects('dataGridRowCell')
      .toArray()
      .map((cell) => $(cell).find('.euiDataGridRowCell__content').text());

    const rows = chunk(cells, columns.length);

    return {
      columns,
      rows,
    };
  }

  /**
   * Converts the data grid data into nested array
   * [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
   * @param element table
   */
  public async getDataFromElement(
    element: WebElementWrapper,
    cellDataTestSubj: string
  ): Promise<string[][]> {
    const $ = await element.parseDomContent();
    const columnNumber = $('.euiDataGridHeaderCell').length;
    const cells = $.findTestSubjects('dataGridRowCell')
      .toArray()
      .map((cell) =>
        $(cell)
          .findTestSubject(cellDataTestSubj)
          .text()
          .replace(/&nbsp;/g, '')
          .trim()
      );

    return chunk(cells, columnNumber);
  }

  /**
   * Returns an array of data grid headers names
   */
  public getHeaderText(parsedDomContent: CustomCheerioStatic) {
    const $ = parsedDomContent;
    return $('.euiDataGridHeaderCell')
      .toArray()
      .map((cell) => {
        const content = $(cell).find('.euiDataGridHeaderCell__content');
        if (content.length) {
          return content.text();
        } else {
          // Control columns will need hidden text manually stripped
          $(cell).find('[hidden], [data-tabular-copy-marker]').remove();
          return $(cell).text();
        }
      });
  }

  public async getHeaders() {
    const header = await this.testSubjects.find('euiDataGridBody > dataGridHeader');
    return this.getHeaderText(await header.parseDomContent());
  }

  public getHeaderElement(field: string) {
    return this.testSubjects.find(`dataGridHeaderCell-${field}`);
  }

  public async resizeColumn(field: string, delta: number) {
    const header = await this.getHeaderElement(field);
    const originalWidth = (await header.getSize()).width;

    let resizer: WebElementWrapper | undefined;

    if (await this.testSubjects.exists('euiDataGridHeaderDroppable')) {
      // if drag & drop is enabled for data grid columns
      const headerDraggableColumns = await this.find.allByCssSelector(
        '[data-test-subj="euiDataGridHeaderDroppable"] > div'
      );
      // searching for a common parent of the field column header and its resizer
      const fieldHeader: WebElementWrapper | null | undefined = (
        await Promise.all(
          headerDraggableColumns.map(async (column) => {
            const hasFieldColumn =
              (await column.findAllByCssSelector(`[data-gridcell-column-id="${field}"]`)).length >
              0;
            return hasFieldColumn ? column : null;
          })
        )
      ).find(Boolean);

      resizer = await fieldHeader?.findByTestSubject('dataGridColumnResizer');
    } else {
      // if drag & drop is not enabled for data grid columns
      resizer = await header.findByCssSelector(
        this.testSubjects.getCssSelector('dataGridColumnResizer')
      );
    }

    if (!resizer) {
      throw new Error(`Unable to find column resizer for field ${field}`);
    }

    await this.browser.dragAndDrop({ location: resizer }, { location: { x: delta, y: 0 } });
    return { originalWidth, newWidth: (await header.getSize()).width };
  }

  private getCellElementSelector(rowIndex: number = 0, columnIndex: number = 0) {
    return `[data-test-subj="euiDataGridBody"] [data-test-subj="dataGridRowCell"][data-gridcell-column-index="${columnIndex}"][data-gridcell-visible-row-index="${rowIndex}"]`;
  }

  /**
   * Returns a grid cell element by row & column indexes.
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   */
  public async getCellElement(rowIndex: number = 0, columnIndex: number = 0) {
    return await this.find.byCssSelector(this.getCellElementSelector(rowIndex, columnIndex));
  }

  public async getControlColumnsCount() {
    const controlsHeaderSelector = '.euiDataGridHeaderCell--controlColumn';
    return (await this.find.allByCssSelector(controlsHeaderSelector)).length;
  }

  public async getCellElementExcludingControlColumns(
    rowIndex: number = 0,
    columnIndexAfterControlColumns: number = 0
  ) {
    const controlsCount = await this.getControlColumnsCount();
    return await this.find.byCssSelector(
      this.getCellElementSelector(rowIndex, controlsCount + columnIndexAfterControlColumns)
    );
  }

  public async getCellElementByColumnName(rowIndex: number, columnName: string) {
    return await this.find.byCssSelector(
      `[data-test-subj="euiDataGridBody"] [data-test-subj="dataGridRowCell"][data-gridcell-column-id="${columnName}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
  }

  private async getCellActionButton(
    rowIndex: number = 0,
    { columnIndex = 0, columnName }: { columnIndex?: number; columnName?: string },
    selector: string
  ): Promise<WebElementWrapper> {
    let actionButton: WebElementWrapper | undefined;
    await this.retry.try(async () => {
      const cell = columnName
        ? await this.getCellElementByColumnName(rowIndex, columnName)
        : await this.getCellElement(rowIndex, columnIndex);
      await cell.moveMouseTo();
      await cell.click();
      actionButton = await cell.findByTestSubject(selector);
      if (!actionButton) {
        throw new Error(`Unable to find cell action button ${selector}`);
      }
    });
    return actionButton!;
  }

  /**
   * Clicks grid cell 'expand' action button
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   * @param columnName column/field name
   */
  public async clickCellExpandButton(
    rowIndex: number = 0,
    { columnIndex = 0, columnName }: { columnIndex?: number; columnName?: string }
  ) {
    const actionButton = await this.getCellActionButton(
      rowIndex,
      { columnIndex, columnName },
      'euiDataGridCellExpandButton'
    );
    await actionButton.moveMouseTo();
    await actionButton.click();
    await this.retry.waitFor('popover to be opened', async () => {
      return await this.testSubjects.exists('euiDataGridExpansionPopover');
    });
  }

  /**
   * Clicks grid cell 'expand' action button
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   */
  public async clickCellExpandButtonExcludingControlColumns(
    rowIndex: number = 0,
    columnIndex: number = 0
  ) {
    const controlsCount = await this.getControlColumnsCount();
    await this.clickCellExpandButton(rowIndex, { columnIndex: controlsCount + columnIndex });
  }

  /**
   * Clicks a cell action button within the expanded cell popover
   * @param cellActionId The ID of the registered cell action
   */
  public async clickCellExpandPopoverAction(cellActionId: string) {
    await this.testSubjects.click(`*dataGridColumnCellAction-${cellActionId}`);
  }

  /**
   * Checks if a cell action button exists within the expanded cell popover
   * @param cellActionId The ID of the registered cell action
   * @returns If the cell action button exists
   */
  public async cellExpandPopoverActionExists(cellActionId: string) {
    return await this.testSubjects.exists(`*dataGridColumnCellAction-${cellActionId}`);
  }

  /**
   * Clicks grid cell 'filter for' action button
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   */
  public async clickCellFilterForButton(rowIndex: number = 0, columnIndex: number = 0) {
    const actionButton = await this.getCellActionButton(
      rowIndex,
      { columnIndex },
      'filterForButton'
    );
    await actionButton.moveMouseTo();
    await actionButton.click();
  }

  /**
   * Clicks grid cell 'filter for' action button
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   */
  public async clickCellFilterForButtonExcludingControlColumns(
    rowIndex: number = 0,
    columnIndex: number = 0
  ) {
    const controlsCount = await this.getControlColumnsCount();
    const actionButton = await this.getCellActionButton(
      rowIndex,
      { columnIndex: controlsCount + columnIndex },
      'filterForButton'
    );
    await actionButton.moveMouseTo();
    await actionButton.click();
  }

  public async clickCellFilterOutButton(rowIndex: number = 0, columnIndex: number = 0) {
    const actionButton = await this.getCellActionButton(
      rowIndex,
      { columnIndex },
      'filterOutButton'
    );
    await actionButton.moveMouseTo();
    await actionButton.click();
  }

  public async clickCellFilterOutButtonExcludingControlColumns(
    rowIndex: number = 0,
    columnIndex: number = 0
  ) {
    const controlsCount = await this.getControlColumnsCount();
    const actionButton = await this.getCellActionButton(
      rowIndex,
      { columnIndex: controlsCount + columnIndex },
      'filterOutButton'
    );
    await actionButton.moveMouseTo();
    await actionButton.click();
  }

  /**
   * The same as getCellElement, but useful when multiple data grids are on the page.
   */
  public async getAllCellElements(rowIndex: number = 0, columnIndex: number = 0) {
    return await this.find.allByCssSelector(this.getCellElementSelector(rowIndex, columnIndex));
  }

  public async getDocCount(): Promise<number> {
    const grid = await this.find.byCssSelector('[data-document-number]');
    return Number(await grid.getAttribute('data-document-number'));
  }

  public async getFields(options?: SelectOptions) {
    const selector = options?.isAnchorRow
      ? '.euiDataGridRowCell.unifiedDataTable__cell--highlight'
      : '.euiDataGridRowCell';
    const cells = await this.find.allByCssSelector(selector);

    const rows: string[][] = [];
    let rowIdx = -1;
    let prevVisibleRowIndex = -1;
    for (const cell of cells) {
      const visibleRowIndex = Number(await cell.getAttribute('data-gridcell-visible-row-index'));
      if (prevVisibleRowIndex !== visibleRowIndex) {
        rowIdx++;
        rows[rowIdx] = [];
        prevVisibleRowIndex = visibleRowIndex;
      }
      if (!(await cell.elementHasClass('euiDataGridRowCell--controlColumn'))) {
        rows[rowIdx].push(await cell.getVisibleText());
      }
    }
    return rows;
  }

  public async getTable(selector: string = 'docTable') {
    return await this.testSubjects.find(selector);
  }

  public async getBodyRows(
    options?: SelectOptions,
    selector: string = 'docTable'
  ): Promise<WebElementWrapper[][]> {
    return this.getDocTableRows(options, selector);
  }

  public async getRowsText(renderMoreRows?: boolean) {
    // open full screen mode
    if (renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }

    const table = await this.getTable('docTable');
    const rows = await table.findAllByCssSelector('.euiDataGridRow');

    const rowsText = [];
    for (const row of rows) {
      rowsText.push((await row.getVisibleText()).replace(/[\r\n]/gm, ''));
    }

    // close full screen mode
    if (renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }
    return rowsText;
  }

  /**
   * Returns an array of rows (which are array of cells)
   */
  public async getDocTableRows(options?: SelectOptions, selector: string = 'docTable') {
    // open full screen mode
    if (options?.renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }

    const table = await this.getTable(selector);

    if (!table) {
      return [];
    }

    const cellSelector = options?.isAnchorRow
      ? '.euiDataGridRowCell.unifiedDataTable__cell--highlight'
      : '.euiDataGridRowCell';
    const cells = await table.findAllByCssSelector(cellSelector);

    const rows: WebElementWrapper[][] = [];
    let rowIdx = -1;
    for (const cell of cells) {
      if (await cell.elementHasClass('euiDataGridRowCell--firstColumn')) {
        rowIdx++;
        rows[rowIdx] = [];
      }
      rows[rowIdx].push(cell);
    }

    // close full screen mode
    if (options?.renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }
    return rows;
  }

  /**
   * Returns an array of cells for that row
   */
  public async getRow(
    options: SelectOptions,
    selector: string = 'docTable'
  ): Promise<WebElementWrapper[]> {
    return (await this.getBodyRows(options, selector))[options.rowIndex || 0];
  }

  public async clickRowToggle(
    { defaultTabId, ...options }: SelectOptions & { defaultTabId?: string | false } = {
      isAnchorRow: false,
      rowIndex: 0,
    }
  ): Promise<void> {
    const testSubj = options.isAnchorRow
      ? 'docTableExpandToggleColumnAnchor'
      : 'docTableExpandToggleColumn';

    let toggle: WebElementWrapper | undefined;

    await this.retry.try(async () => {
      toggle = await this.find.byCssSelector(
        `${
          options.isAnchorRow
            ? ''
            : `.euiDataGridRow[data-grid-visible-row-index="${options.rowIndex || 0}"] `
        }[data-test-subj="${testSubj}"]`
      );
    });

    if (toggle) {
      await toggle.scrollIntoViewIfNecessary();
      await toggle.moveMouseTo();
      await toggle.click();
      await this.retry.waitFor('doc viewer to open', async () => {
        return this.isShowingDocViewer();
      });
    } else {
      throw new Error('Unable to find row toggle element');
    }

    if (defaultTabId !== false) {
      await this.clickDocViewerTab(defaultTabId ?? 'doc_view_table');
    }
  }

  public async isShowingDocViewer() {
    return await this.testSubjects.exists('kbnDocViewer');
  }

  public async clickDocViewerTab(id: string) {
    return await this.find.clickByCssSelector(`#kbn_doc_viewer_tab_${id}`);
  }

  public async getDetailsRows(): Promise<WebElementWrapper[]> {
    return await this.testSubjects.findAll('docViewerFlyout');
  }

  public async closeFlyout() {
    await this.testSubjects.click('euiFlyoutCloseButton');
  }

  public async getHeaderFields(): Promise<string[]> {
    const result = await this.find.allByCssSelector('.euiDataGridHeaderCell__content');

    const textArr = [];
    for (const cell of result) {
      const cellText = await cell.getVisibleText();
      textArr.push(cellText.trim());
    }
    return textArr;
  }

  public async getControlColumnHeaderFields(): Promise<string[]> {
    const result = await this.find.allByCssSelector('.euiDataGridHeaderCell--controlColumn');

    const textArr = [];
    for (const cell of result) {
      const cellText = await cell.getVisibleText();
      textArr.push(cellText.trim());
    }
    return textArr;
  }

  public async getRowActions(
    options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
  ): Promise<WebElementWrapper[]> {
    const detailsRow = (await this.getDetailsRows())[options.rowIndex || 0];
    return await detailsRow.findAllByTestSubject('~docTableRowAction');
  }

  public async openColMenuByField(field: string) {
    await this.retry.waitFor('header cell action being displayed', async () => {
      // to prevent flakiness
      await this.testSubjects.moveMouseTo(`dataGridHeaderCell-${field}`);
      await this.testSubjects.click(`dataGridHeaderCellActionButton-${field}`);
      return await this.testSubjects.exists(`dataGridHeaderCellActionGroup-${field}`);
    });
  }

  public async clickColumnActionAt(field: string, index: number) {
    await this.openColMenuByField(field);
    const actionsGroup = await this.testSubjects.find(`dataGridHeaderCellActionGroup-${field}`);
    const actionButtons = await actionsGroup.findAllByTagName('button');
    await actionButtons[index].click();
  }

  private async clickColumnMenuField(field?: string) {
    if (field) {
      await this.openColMenuByField(field);
    } else {
      const columns = await this.find.allByCssSelector(
        '.euiDataGridHeaderCell:not(.euiDataGridHeaderCell--controlColumn)'
      );
      await columns[0].moveMouseTo();
      await this.find.clickByCssSelector('.euiDataGridHeaderCell__button');
    }
  }

  public async clickDocSortAsc(field?: string, sortText = 'Sort Old-New') {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText(sortText);
  }

  public async clickDocSortDesc(field?: string, sortText = 'Sort New-Old') {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText(sortText);
  }

  public async clickMoveColumnRight(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Move right');
  }

  public async clickMoveColumnLeft(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Move left');
  }

  public async clickHideColumn(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Hide column');
  }

  public async clickRemoveColumn(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Remove column');
  }

  public async clickCopyColumnValues(field: string) {
    await this.openColMenuByField(field);
    await this.find.clickByButtonText('Copy column');
  }

  public async clickCopyColumnName(field: string) {
    await this.openColMenuByField(field);
    await this.find.clickByButtonText('Copy name');
  }

  public async clickEditField(field: string) {
    await this.openColMenuByField(field);
    await this.testSubjects.click('gridEditFieldButton');
  }

  public async resetColumnWidthExists(field: string) {
    await this.openColMenuByField(field);
    return await this.testSubjects.exists('unifiedDataTableResetColumnWidth');
  }

  public async clickResetColumnWidth(field: string) {
    await this.openColMenuByField(field);
    await this.testSubjects.click('unifiedDataTableResetColumnWidth');
  }

  public async clickGridSettings() {
    await this.testSubjects.click('dataGridDisplaySelectorButton');
  }

  public async getCurrentRowHeightValue(scope: 'row' | 'header' = 'row') {
    const buttonGroup = await this.testSubjects.find(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_rowHeightButtonGroup`
    );
    let value = '';
    await this.retry.waitFor(`${scope} height value not to be empty`, async () => {
      // to prevent flakiness
      const selectedButton = await buttonGroup.findByCssSelector(
        '.euiButtonGroupButton-isSelected'
      );
      value = await selectedButton.getVisibleText();
      return value !== '';
    });
    return value;
  }

  public async getCustomRowHeightNumber(scope: 'row' | 'header' = 'row') {
    const input = await this.testSubjects.find(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_lineCountNumber`
    );
    return Number(await input.getAttribute('value'));
  }

  public async changeRowHeightValue(newValue: string) {
    const buttonGroup = await this.testSubjects.find(
      'unifiedDataTableRowHeightSettings_rowHeightButtonGroup'
    );
    const option = await buttonGroup.findByCssSelector(`[data-text="${newValue}"]`);
    await option.click();
  }

  public async changeCustomRowHeightNumber(newValue: number) {
    await this.testSubjects.setValue(
      'unifiedDataTableRowHeightSettings_lineCountNumber',
      newValue.toString()
    );
  }

  public async getCurrentHeaderRowHeightValue() {
    return await this.getCurrentRowHeightValue('header');
  }

  public async changeHeaderRowHeightValue(newValue: string) {
    const buttonGroup = await this.testSubjects.find(
      'unifiedDataTableHeaderRowHeightSettings_rowHeightButtonGroup'
    );
    const option = await buttonGroup.findByCssSelector(`[data-text="${newValue}"]`);
    await option.click();
  }

  public async getCurrentDensityValue() {
    const buttonGroup = await this.testSubjects.find('densityButtonGroup');
    const selectedButton = await buttonGroup.findByCssSelector('[aria-pressed=true]');
    return selectedButton.getVisibleText();
  }

  public async changeDensityValue(newValue: string) {
    const buttonGroup = await this.testSubjects.find('densityButtonGroup');
    const option = await buttonGroup.findByCssSelector(`[data-text="${newValue}"]`);
    await option.click();
  }

  private async findSampleSizeInput() {
    return await this.find.byCssSelector(
      'input[type="number"][data-test-subj="unifiedDataTableSampleSizeInput"]'
    );
  }

  public async getCurrentSampleSizeValue() {
    const sampleSizeInput = await this.findSampleSizeInput();
    return Number(await sampleSizeInput.getAttribute('value'));
  }

  public async changeSampleSizeValue(newValue: number) {
    const sampleSizeInput = await this.findSampleSizeInput();
    await sampleSizeInput.focus();
    // replacing the input values with a new one
    await sampleSizeInput.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      'a',
    ]);
    await sampleSizeInput.type(String(newValue));
  }

  public async showFieldCellActionInFlyout(fieldName: string, actionName: string): Promise<void> {
    const cellSelector = ['addFilterForValueButton', 'addFilterOutValueButton'].includes(actionName)
      ? `tableDocViewRow-${fieldName}-value`
      : `tableDocViewRow-${fieldName}-name`;
    await this.testSubjects.moveMouseTo(cellSelector);
    await this.testSubjects.click(cellSelector);

    await this.retry.waitFor('grid cell actions to appear', async () => {
      return this.testSubjects.exists(`${actionName}-${fieldName}`);
    });
  }

  public async clickFieldActionInFlyout(fieldName: string, actionName: string): Promise<void> {
    await this.showFieldCellActionInFlyout(fieldName, actionName);

    const actionSelector = `${actionName}-${fieldName}`;
    await this.testSubjects.moveMouseTo(actionSelector);
    await this.testSubjects.click(actionSelector);
  }

  public async isFieldPinnedInFlyout(fieldName: string): Promise<boolean> {
    return !(
      await this.testSubjects.getAttribute(`unifiedDocViewer_pinControl_${fieldName}`, 'class')
    )?.includes('kbnDocViewer__fieldsGrid__pinAction');
  }

  public async togglePinActionInFlyout(fieldName: string): Promise<void> {
    await this.testSubjects.moveMouseTo(`unifiedDocViewer_pinControl_${fieldName}`);
    const isPinned = await this.isFieldPinnedInFlyout(fieldName);
    await this.retry.waitFor('pin action to appear', async () => {
      return this.testSubjects.exists(`unifiedDocViewer_pinControlButton_${fieldName}`);
    });
    await this.testSubjects.click(`unifiedDocViewer_pinControlButton_${fieldName}`);
    await this.retry.waitFor('pin action to toggle', async () => {
      return (await this.isFieldPinnedInFlyout(fieldName)) !== isPinned;
    });
  }

  public async expandFieldNameCellInFlyout(fieldName: string): Promise<void> {
    const cellSelector = `tableDocViewRow-${fieldName}-name`;
    const buttonSelector = 'euiDataGridCellExpandButton';
    await this.testSubjects.moveMouseTo(cellSelector);
    await this.testSubjects.click(cellSelector);
    await this.retry.waitFor('grid cell actions to appear', async () => {
      return this.testSubjects.exists(buttonSelector);
    });
    await this.testSubjects.moveMouseTo(buttonSelector);
    await this.testSubjects.click(buttonSelector);
  }

  public async hasNoResults() {
    return await this.find.existsByCssSelector('.euiDataGrid__noResults');
  }

  public async checkCurrentRowsPerPageToBe(value: number) {
    await this.retry.try(async () => {
      return (
        (await this.testSubjects.getVisibleText('tablePaginationPopoverButton')) ===
        `Rows per page: ${value}`
      );
    });
  }

  public async changeRowsPerPageTo(newValue: number) {
    await this.testSubjects.click('tablePaginationPopoverButton');
    const option = `tablePagination-${newValue}-rows`;
    await this.retry.try(async () => {
      return this.testSubjects.exists(option);
    });
    await this.testSubjects.click(option);
    await this.checkCurrentRowsPerPageToBe(newValue);
  }

  public async selectRow(rowIndex: number, { pressShiftKey }: { pressShiftKey?: boolean } = {}) {
    const checkbox = await this.find.byCssSelector(
      `.euiDataGridRow[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="select"] .euiCheckbox__input`
    );

    if (pressShiftKey) {
      await this.browser
        .getActions()
        .keyDown(Key.SHIFT)
        .click(checkbox._webElement)
        .keyUp(Key.SHIFT)
        .perform();
    } else {
      await checkbox.click();
    }
  }

  public async getNumberOfSelectedRows() {
    const label = await this.find.byCssSelector(
      '[data-test-subj=unifiedDataTableSelectionBtn] .euiNotificationBadge'
    );
    return Number(await label.getVisibleText());
  }

  public async getNumberOfSelectedRowsOnCurrentPage() {
    const selectedRows = await this.find.allByCssSelector(
      '.euiDataGridRow [data-gridcell-column-id="select"] .euiCheckbox__input:checked'
    );
    return selectedRows.length;
  }

  public async toggleSelectAllRowsOnCurrentPage() {
    const checkbox = await this.testSubjects.find('selectAllDocsOnPageToggle');

    await checkbox.click();
  }

  public async selectAllRows() {
    const button = await this.testSubjects.find('dscGridSelectAllDocs');

    await button.click();
  }

  public async isSelectedRowsMenuVisible() {
    return await this.testSubjects.exists('unifiedDataTableSelectionBtn');
  }

  public async openSelectedRowsMenu() {
    await this.testSubjects.click('unifiedDataTableSelectionBtn');
    await this.retry.try(async () => {
      return await this.testSubjects.exists('unifiedDataTableSelectionMenu');
    });
  }

  public async closeSelectedRowsMenu() {
    await this.testSubjects.click('unifiedDataTableSelectionBtn');
    await this.retry.try(async () => {
      return !(await this.testSubjects.exists('unifiedDataTableSelectionMenu'));
    });
  }

  public async compareSelectedButtonExists() {
    await this.openSelectedRowsMenu();
    const exists = await this.testSubjects.exists('unifiedDataTableCompareSelectedDocuments');
    await this.closeSelectedRowsMenu();
    return exists;
  }

  public async clickCompareSelectedButton() {
    await this.openSelectedRowsMenu();
    await this.testSubjects.click('unifiedDataTableCompareSelectedDocuments');
  }

  public async waitForComparisonModeToLoad() {
    await this.retry.try(async () => {
      return await this.testSubjects.exists('unifiedDataTableCompareDocuments');
    });
  }

  public async getComparisonDisplay() {
    const display = await this.testSubjects.find('unifiedDataTableComparisonDisplay');
    return await display.getVisibleText();
  }

  public async getComparisonFieldNames() {
    const fields = await this.testSubjects.findAll('unifiedDataTableComparisonFieldName');
    return await Promise.all(fields.map((field) => field.getVisibleText()));
  }

  public async getComparisonRow(rowIndex: number) {
    const columns = await this.getRow({ rowIndex }, 'unifiedDataTableCompareDocuments');
    const fieldName = await columns[0]
      .findByTestSubject('unifiedDataTableComparisonFieldName')
      .then((field) => field.getVisibleText());
    const values = await Promise.all(
      columns.slice(1).map(async (cell) =>
        cell
          .findByClassName('unifiedDataTable__cellValue')
          .then((cellValue) => cellValue.parseDomContent())
          .then((content) => content.html())
      )
    );
    return { fieldName, values };
  }

  public async openComparisonSettingsMenu() {
    if (await this.testSubjects.exists('unifiedDataTableComparisonSettingsMenu')) {
      return;
    }
    await this.testSubjects.click('unifiedDataTableComparisonSettings');
    await this.retry.try(async () => {
      return await this.testSubjects.exists('unifiedDataTableComparisonSettingsMenu');
    });
  }

  public async toggleShowDiffSwitch() {
    await this.openComparisonSettingsMenu();
    await this.testSubjects.click('unifiedDataTableShowDiffSwitch');
  }

  public async selectComparisonDiffMode(diffMode: 'basic' | 'chars' | 'words' | 'lines') {
    await this.openComparisonSettingsMenu();
    const menuEntry = await this.testSubjects.find(`unifiedDataTableDiffMode-${diffMode}`);
    await menuEntry.click();
  }

  public async getComparisonDiffSegments(rowIndex: number, cellIndex: number) {
    const columns = await this.getRow({ rowIndex }, 'unifiedDataTableCompareDocuments');
    const segments = await columns[cellIndex].findAllByClassName(
      'unifiedDataTable__comparisonSegment'
    );
    return Promise.all(
      segments.map(async (segment) => {
        const decoration = await segment.getComputedStyle('text-decoration');
        return {
          decoration: decoration.includes('underline')
            ? 'added'
            : decoration.includes('line-through')
            ? 'removed'
            : undefined,
          value: await segment.getVisibleText(),
        };
      })
    );
  }

  public async showAllFieldsSwitchExists() {
    await this.openComparisonSettingsMenu();
    return await this.testSubjects.exists('unifiedDataTableDiffOptionSwitch-showAllFields');
  }

  public async toggleShowAllFieldsSwitch() {
    await this.openComparisonSettingsMenu();
    await this.testSubjects.click('unifiedDataTableDiffOptionSwitch-showAllFields');
  }

  public async toggleShowMatchingValuesSwitch() {
    await this.openComparisonSettingsMenu();
    await this.testSubjects.click('unifiedDataTableDiffOptionSwitch-showMatchingValues');
  }

  public async toggleShowDiffDecorationsSwitch() {
    await this.openComparisonSettingsMenu();
    await this.testSubjects.click('unifiedDataTableDiffOptionSwitch-showDiffDecorations');
  }

  public async exitComparisonMode() {
    await this.testSubjects.click('unifiedDataTableExitDocumentComparison');
  }

  public async getCurrentPageNumber() {
    const currentPage = await this.find.byCssSelector('.euiPaginationButton[aria-current="true"]');
    return await currentPage.getVisibleText();
  }

  public async runInTableSearch(searchTerm: string) {
    if (!(await this.testSubjects.exists(INPUT_TEST_SUBJ))) {
      await this.testSubjects.click(BUTTON_TEST_SUBJ);
      await this.retry.waitFor('input to appear', async () => {
        return await this.testSubjects.exists(INPUT_TEST_SUBJ);
      });
    }
    const prevCounter = await this.testSubjects.getVisibleText(COUNTER_TEST_SUBJ);
    await this.testSubjects.setValue(INPUT_TEST_SUBJ, searchTerm);
    await this.retry.waitFor('counter to change', async () => {
      return (await this.testSubjects.getVisibleText(COUNTER_TEST_SUBJ)) !== prevCounter;
    });
  }

  public async exitInTableSearch() {
    if (!(await this.testSubjects.exists(INPUT_TEST_SUBJ))) {
      return;
    }
    const input = await this.testSubjects.find(INPUT_TEST_SUBJ);
    await input.pressKeys(this.browser.keys.ESCAPE);
    await this.retry.waitFor('input to hide', async () => {
      return (
        !(await this.testSubjects.exists(INPUT_TEST_SUBJ)) &&
        (await this.testSubjects.exists(BUTTON_TEST_SUBJ))
      );
    });
  }

  private async jumpToInTableSearchMatch(buttonTestSubj: string) {
    const prevCounter = await this.testSubjects.getVisibleText(COUNTER_TEST_SUBJ);
    await this.testSubjects.click(buttonTestSubj);
    await this.retry.waitFor('counter to change', async () => {
      return (await this.testSubjects.getVisibleText(COUNTER_TEST_SUBJ)) !== prevCounter;
    });
  }

  public async goToPrevInTableSearchMatch() {
    await this.jumpToInTableSearchMatch(BUTTON_PREV_TEST_SUBJ);
  }

  public async goToNextInTableSearchMatch() {
    await this.jumpToInTableSearchMatch(BUTTON_NEXT_TEST_SUBJ);
  }

  public async getInTableSearchMatchesCounter() {
    return (await this.testSubjects.getVisibleText(COUNTER_TEST_SUBJ)).trim();
  }

  public async getInTableSearchCellMatchElements(rowIndex: number, columnName: string) {
    const cell = await this.getCellElementByColumnName(rowIndex, columnName);
    return await cell.findAllByCssSelector(`.${HIGHLIGHT_CLASS_NAME}`);
  }

  public async getInTableSearchCellMatchesCount(rowIndex: number, columnName: string) {
    return (await this.getInTableSearchCellMatchElements(rowIndex, columnName)).length;
  }
}
