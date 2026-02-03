/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { EuiPaginationTestHarness, EuiTableTestHarness } from '@kbn/test-eui-helpers';

import { kibanaVersion } from '../client_integration/helpers/setup_environment';
import { runPendingTimers, runPendingTimersUntil } from '../helpers/fake_timers';
import {
  clickRowCheckboxAtRowIndex,
  clickRowCheckboxByName,
  getNamesText,
  getRowIndexByName,
  getRowIndicesByStatus,
  getStatusTextAtRow,
  indices,
  openMenuAndClickOption,
  openMenuAndGetButtonText,
  renderIndexApp,
} from './index_table.helpers';

jest.mock('react-use/lib/useObservable', () => () => jest.fn());

describe('index table', () => {
  beforeEach(() => {
    // NOTE: This suite intentionally uses fake timers for performance.
    // Some tests use delayed HTTP responses to assert intermediate UI states (e.g. "flushing..."),
    // which would otherwise require waiting real-time seconds in CI.
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(async () => {
    // Best-effort cleanup: ensure the actions popover doesn't remain open between tests.
    if (
      screen.queryByTestId('indexContextMenu') &&
      screen.queryByTestId('indexActionsContextMenuButton')
    ) {
      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
    }

    await runPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should change pages when a pagination link is clicked on', async () => {
    await renderIndexApp();

    // Page 1 first row
    const indexTable = new EuiTableTestHarness('indexTable');
    const firstRow = indexTable.getRows()[0] ?? null;
    expect(within(firstRow).getByTestId('indexTableIndexNameLink')).toHaveTextContent('testy0');

    const pagination = new EuiPaginationTestHarness();
    pagination.click('2');

    await waitFor(() => {
      const updatedFirstRow = indexTable.getRows()[0] ?? null;
      expect(within(updatedFirstRow).getByTestId('indexTableIndexNameLink')).toHaveTextContent(
        'testy6'
      );
    });
  });

  test('should show more when per page value is increased', async () => {
    await renderIndexApp();

    // Open the items-per-page popover (EuiTablePagination)
    const itemsPerPageButton = screen.getByRole('button', { name: /Rows per page/i });
    fireEvent.click(itemsPerPageButton);

    // Select 50
    const option50 = await screen.findByText('50 rows');
    fireEvent.click(option50);

    await waitFor(() => {
      expect(screen.getAllByTestId('indexTableIndexNameLink')).toHaveLength(50);
    });
  });

  test('should show the Actions menu button only when at least one row is selected', async () => {
    await renderIndexApp();

    expect(screen.queryByTestId('indexActionsContextMenuButton')).not.toBeInTheDocument();

    clickRowCheckboxByName('testy0');

    expect(await screen.findByTestId('indexActionsContextMenuButton')).toBeInTheDocument();
  });

  test('should update the Actions menu button text when more than one row is selected', async () => {
    await renderIndexApp();

    expect(screen.queryByTestId('indexActionsContextMenuButton')).not.toBeInTheDocument();

    clickRowCheckboxByName('testy0');
    expect(await screen.findByTestId('indexActionsContextMenuButton')).toHaveTextContent(
      'Manage index'
    );

    clickRowCheckboxByName('testy1');
    expect(screen.getByTestId('indexActionsContextMenuButton')).toHaveTextContent(
      'Manage 2 indices'
    );
  });

  test('should show hidden indices only when the switch is turned on', async () => {
    await renderIndexApp();

    // We have manually set `.admin1` and `.admin3` as hidden indices
    // We **don't** expect them to be in this list as by default we don't show hidden indices
    let indicesInTable = getNamesText();
    expect(indicesInTable).not.toContain('.admin1');
    expect(indicesInTable).not.toContain('.admin3');

    if (kibanaVersion.major >= 8) {
      // From 8.x indices starting with a period are treated as normal indices
      expect(indicesInTable).toContain('.admin0');
      expect(indicesInTable).toContain('.admin2');
    } else {
      // In 7.x those are treated as system and are thus hidden
      expect(indicesInTable).not.toContain('.admin0');
      expect(indicesInTable).not.toContain('.admin2');
    }

    // Enable "Show hidden indices"
    fireEvent.click(screen.getByTestId('checkboxToggles-includeHiddenIndices'));

    await waitFor(() => {
      indicesInTable = getNamesText();
      expect(indicesInTable).toContain('.admin1');
      expect(indicesInTable).toContain('.admin3');
    });
  });

  test('should filter based on content of search input', async () => {
    await renderIndexApp();

    const searchInput = screen.getByTestId('indicesSearch');
    fireEvent.change(searchInput, { target: { value: 'testy0' } });

    await waitFor(() => {
      expect(getNamesText()).toEqual(['testy0']);
    });
  });

  test('should sort when header is clicked', async () => {
    await renderIndexApp();
    const indexTable = new EuiTableTestHarness('indexTable');

    const headerCell = screen.getByTestId('indexTableHeaderCell-name');
    const sortButton = within(headerCell).getByRole('button');

    fireEvent.click(sortButton);

    const firstRowAsc = indexTable.getRows()[0] ?? null;
    expect(within(firstRowAsc).getByTestId('indexTableIndexNameLink')).toHaveTextContent('.admin0');

    fireEvent.click(sortButton);

    // Descending lexical sort means `testy9` will come before `testy29` (`"9"` > `"2"`).
    const firstRowDesc = indexTable.getRows()[0] ?? null;
    expect(within(firstRowDesc).getByTestId('indexTableIndexNameLink')).toHaveTextContent('testy9');
  });

  test('should show the right context menu options when one index is selected and open', async () => {
    await renderIndexApp();

    const items = await openMenuAndGetButtonText(0);

    expect(items).toEqual([
      'Show index overview',
      'Show index settings',
      'Show index mapping',
      'Show index stats',
      'Close index',
      'Force merge index',
      'Refresh index',
      'Clear index cache',
      'Flush index',
      'Delete index',
      'Convert to lookup index',
    ]);
  });

  test('should show the right context menu options when one index is selected and closed', async () => {
    await renderIndexApp();

    const items = await openMenuAndGetButtonText(1);

    expect(items).toEqual([
      'Show index overview',
      'Show index settings',
      'Show index mapping',
      'Open index',
      'Delete index',
      'Convert to lookup index',
    ]);
  });

  test('should not show "Convert to lookup index" option in the context menu when lookup index is selected', async () => {
    await renderIndexApp();

    const indexName = 'lookup-index';

    const searchInput = screen.getByTestId('indicesSearch');
    fireEvent.change(searchInput, { target: { value: indexName } });

    const rowIndex = getRowIndexByName(indexName);
    expect(rowIndex).toBeGreaterThanOrEqual(0);

    const items = await openMenuAndGetButtonText(rowIndex);

    expect(items).toEqual([
      'Show index overview',
      'Show index settings',
      'Show index mapping',
      'Show index stats',
      'Close index',
      'Force merge index',
      'Refresh index',
      'Clear index cache',
      'Flush index',
      'Delete index',
    ]);
  });

  test('should not show "Convert to lookup index" option in the context menu when hidden index is selected', async () => {
    await renderIndexApp();

    const indexName = '.admin1';

    // Enable "Show hidden indices" so we can select `.admin1`
    fireEvent.click(screen.getByTestId('checkboxToggles-includeHiddenIndices'));

    const searchInput = screen.getByTestId('indicesSearch');
    fireEvent.change(searchInput, { target: { value: indexName } });

    const rowIndex = getRowIndexByName(indexName);
    expect(rowIndex).toBeGreaterThanOrEqual(0);

    const items = await openMenuAndGetButtonText(rowIndex);

    expect(items).toEqual([
      'Show index overview',
      'Show index settings',
      'Show index mapping',
      'Open index',
      'Delete index',
    ]);
  });

  test('should show the right context menu options when one open and one closed index is selected', async () => {
    await renderIndexApp();

    clickRowCheckboxByName('testy0');
    const [closedRowIndex] = getRowIndicesByStatus('closed');
    expect(closedRowIndex).toBeGreaterThanOrEqual(0);
    clickRowCheckboxAtRowIndex(closedRowIndex);

    const manageButton = await screen.findByTestId('indexActionsContextMenuButton');
    fireEvent.click(manageButton);

    const menu = await screen.findByTestId('indexContextMenu');
    const items = within(menu)
      .getAllByRole('button')
      .map((btn) => (btn.textContent || '').trim())
      .filter((t) => t.length > 0);

    expect(items).toEqual(['Open indices', 'Delete indices']);
  });

  test('should show the right context menu options when more than one open index is selected', async () => {
    await renderIndexApp();

    clickRowCheckboxByName('testy0');
    clickRowCheckboxByName('testy2');

    const manageButton = await screen.findByTestId('indexActionsContextMenuButton');
    fireEvent.click(manageButton);

    const menu = await screen.findByTestId('indexContextMenu');
    const items = within(menu)
      .getAllByRole('button')
      .map((btn) => (btn.textContent || '').trim())
      .filter((t) => t.length > 0);

    expect(items).toEqual([
      'Close indices',
      'Force merge indices',
      'Refresh indices',
      'Clear indices cache',
      'Flush indices',
      'Delete indices',
    ]);
  });

  test('should show the right context menu options when more than one closed index is selected', async () => {
    await renderIndexApp();

    const closedRowIndices = getRowIndicesByStatus('closed');
    expect(closedRowIndices.length).toBeGreaterThanOrEqual(2);
    clickRowCheckboxAtRowIndex(closedRowIndices[0]);
    clickRowCheckboxAtRowIndex(closedRowIndices[1]);

    const manageButton = await screen.findByTestId('indexActionsContextMenuButton');
    fireEvent.click(manageButton);

    const menu = await screen.findByTestId('indexContextMenu');
    const items = within(menu)
      .getAllByRole('button')
      .map((btn) => (btn.textContent || '').trim())
      .filter((t) => t.length > 0);

    expect(items).toEqual(['Open indices', 'Delete indices']);
  });

  test('flush button works from context menu', async () => {
    await renderIndexApp({ delayResponse: true });

    const rowIndex = getRowIndexByName('testy0');

    // Snapshot equivalent: initial state
    expect(getStatusTextAtRow(rowIndex)).toBe('open');

    await openMenuAndClickOption(rowIndex, 'flushIndexMenuButton');

    expect(getStatusTextAtRow(rowIndex)).toBe('flushing...');

    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'open');
  });

  test('clear cache button works from context menu', async () => {
    await renderIndexApp({ delayResponse: true });

    const rowIndex = getRowIndexByName('testy0');

    expect(getStatusTextAtRow(rowIndex)).toBe('open');

    await openMenuAndClickOption(rowIndex, 'clearCacheIndexMenuButton');

    expect(getStatusTextAtRow(rowIndex)).toBe('clearing cache...');

    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'open');
  });

  test('refresh button works from context menu', async () => {
    await renderIndexApp({ delayResponse: true });

    const rowIndex = getRowIndexByName('testy0');

    expect(getStatusTextAtRow(rowIndex)).toBe('open');

    await openMenuAndClickOption(rowIndex, 'refreshIndexMenuButton');

    expect(getStatusTextAtRow(rowIndex)).toBe('refreshing...');

    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'open');
  });

  test('force merge button works from context menu', async () => {
    await renderIndexApp({ delayResponse: true });

    const rowIndex = getRowIndexByName('testy0');

    expect(getStatusTextAtRow(rowIndex)).toBe('open');

    // Open menu and click force merge
    const checkboxes = screen.getAllByTestId('indexTableRowCheckbox');
    fireEvent.click(checkboxes[rowIndex]);

    const manageButton = await screen.findByTestId('indexActionsContextMenuButton');
    fireEvent.click(manageButton);

    const menu = await screen.findByTestId('indexContextMenu');
    fireEvent.click(within(menu).getByTestId('forcemergeIndexMenuButton'));

    // Modal should appear
    const confirmButton = await screen.findByTestId('confirmModalConfirmButton');

    // Snapshot equivalent: "forcing merge..." after confirm
    fireEvent.click(confirmButton);

    expect(getStatusTextAtRow(rowIndex)).toBe('forcing merge...');

    // Modal should close once request resolves
    await runPendingTimersUntil(() => screen.queryByTestId('confirmModalConfirmButton') === null);
    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'open');
  });

  test('close index button works from context menu', async () => {
    const modifiedIndices = indices.map((index) => {
      return {
        ...index,
        status: index.name === 'testy0' ? 'close' : index.status,
      };
    });

    await renderIndexApp({ reloadIndicesResponse: modifiedIndices, delayResponse: true });

    const rowIndex = getRowIndexByName('testy0');

    expect(getStatusTextAtRow(rowIndex)).toBe('open');

    await openMenuAndClickOption(rowIndex, 'closeIndexMenuButton');

    expect(getStatusTextAtRow(rowIndex)).toBe('closing...');

    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'closed');
  });

  test('open index button works from context menu', async () => {
    const modifiedIndices = indices.map((index) => {
      return {
        ...index,
        status: index.name === 'testy1' ? 'closed' : index.status,
      };
    });

    await renderIndexApp({ loadIndicesResponse: modifiedIndices, delayResponse: true });

    const rowIndex = getRowIndexByName('testy1');

    expect(getStatusTextAtRow(rowIndex)).toBe('closed');

    await openMenuAndClickOption(rowIndex, 'openIndexMenuButton');

    expect(getStatusTextAtRow(rowIndex)).toBe('opening...');

    await runPendingTimersUntil(() => getStatusTextAtRow(rowIndex) === 'open');
  });

  describe('Common index actions', () => {
    test('Common index actions should be hidden when feature is turned off', async () => {
      await renderIndexApp({
        dependenciesOverride: {
          config: { enableIndexActions: false, enableLegacyTemplates: true },
        },
      });

      // Select a row and open the menu (view options can still exist, but index actions should not)
      clickRowCheckboxByName('testy0');
      const manageButton = await screen.findByTestId('indexActionsContextMenuButton');
      fireEvent.click(manageButton);
      await screen.findByTestId('indexContextMenu');

      expect(screen.queryByTestId('showStatsIndexMenuButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('closeIndexMenuButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('forcemergeIndexMenuButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('refreshIndexMenuButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clearCacheIndexMenuButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('flushIndexMenuButton')).not.toBeInTheDocument();
    });
  });
});
