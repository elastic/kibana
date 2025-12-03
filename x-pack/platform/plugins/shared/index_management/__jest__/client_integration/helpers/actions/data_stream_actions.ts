/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { DataStream } from '../../../../common';

/**
 * Helper to extract table cell values from a table element.
 * Replicates the testbed table.getMetaData().tableCellsValues behavior.
 */
export const getTableCellsValues = (tableTestId: string): string[][] => {
  const table = screen.getByTestId(tableTestId);
  const rows = within(table).getAllByRole('row');
  // Skip header row (index 0)
  return rows.slice(1).map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells.map((cell) => cell.textContent?.trim() || '');
  });
};

/**
 * Actions for interacting with the data streams tab.
 */
export const createDataStreamTabActions = () => {
  const goToDataStreamsList = () => {
    fireEvent.click(screen.getByTestId('data_streamsTab'));
  };

  const clickIncludeStatsSwitch = () => {
    fireEvent.click(screen.getByTestId('includeStatsSwitch'));
  };

  const clickReloadButton = () => {
    fireEvent.click(screen.getByTestId('reloadButton'));
  };

  const toggleViewFilterAt = async (index: number) => {
    // Click the view button to open the filter popover
    fireEvent.click(screen.getByTestId('viewButton'));
    // Wait for filter items to appear in the popover
    await waitFor(() => {
      expect(screen.getAllByTestId('filterItem').length).toBeGreaterThan(0);
    });
    // Click the filter item at the specified index
    const filterItems = screen.getAllByTestId('filterItem');
    fireEvent.click(filterItems[index]);
  };

  const clickNameAt = async (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const nameLink = within(dataRow).getByTestId('nameLink');
    fireEvent.click(nameLink);
  };

  const clickIndicesAt = async (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const indicesLink = within(dataRow).getByTestId('indicesLink');
    fireEvent.click(indicesLink);
  };

  const clickDeleteActionAt = (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const deleteButton = within(dataRow).getByTestId('deleteDataStream');
    fireEvent.click(deleteButton);
  };

  const selectDataStream = (name: string, shouldBeSelected: boolean) => {
    const checkbox = screen.getByTestId(`checkboxSelectRow-${name}`);
    // Check if checkbox is currently selected (EUI tables use aria-checked)
    const isCurrentlySelected =
      checkbox.getAttribute('aria-checked') === 'true' ||
      (checkbox as HTMLInputElement).checked === true;

    // Only click if current state differs from desired state
    if (shouldBeSelected !== isCurrentlySelected) {
      fireEvent.click(checkbox);
    }
  };

  const clickConfirmDelete = async () => {
    const confirmButton = await screen.findByTestId('confirmModalConfirmButton');
    fireEvent.click(confirmButton);
  };

  const clickDeleteDataStreamButton = () => {
    fireEvent.click(screen.getByTestId('manageDataStreamButton'));
    fireEvent.click(screen.getByTestId('deleteDataStreamButton'));
  };

  const clickEditDataRetentionButton = () => {
    fireEvent.click(screen.getByTestId('manageDataStreamButton'));
    fireEvent.click(screen.getByTestId('editDataRetentionButton'));
  };

  const clickManageDataStreamsButton = () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
  };

  /**
   * Opens the bulk actions popover and waits for it to be visible.
   */
  const openBulkActionsPopover = async () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    // Wait for the context menu to appear (popover content)
    await screen.findByTestId('dataStreamActionsContextMenu');
  };

  /**
   * Closes the bulk actions popover by clicking the button again (toggle behavior).
   */
  const closeBulkActionsPopover = async () => {
    // Click the button again to toggle the popover closed
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    // Wait for the context menu to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('dataStreamActionsContextMenu')).not.toBeInTheDocument();
    });
  };

  const clickBulkDeleteDataStreamsButton = () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    fireEvent.click(screen.getByTestId('deleteDataStreamsButton'));
  };

  const clickBulkEditDataRetentionButton = () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    fireEvent.click(screen.getByTestId('bulkEditDataRetentionButton'));
  };

  const clickEmptyPromptIndexTemplateLink = () => {
    const link = screen.getByTestId('dataStreamsEmptyPromptTemplateLink');
    fireEvent.click(link);
  };

  const sortTableOnStorageSize = () => {
    const table = screen.getByTestId('dataStreamTable');
    const storageSizeHeader = within(table).getByText('Storage size');
    fireEvent.click(storageSizeHeader);
  };

  const sortTableOnName = () => {
    const table = screen.getByTestId('dataStreamTable');
    const nameHeader = within(table).getByText('Name');
    fireEvent.click(nameHeader);
  };

  return {
    goToDataStreamsList,
    clickIncludeStatsSwitch,
    clickReloadButton,
    toggleViewFilterAt,
    clickNameAt,
    clickIndicesAt,
    clickDeleteActionAt,
    selectDataStream,
    clickConfirmDelete,
    clickDeleteDataStreamButton,
    clickEditDataRetentionButton,
    clickManageDataStreamsButton,
    openBulkActionsPopover,
    closeBulkActionsPopover,
    clickBulkDeleteDataStreamsButton,
    clickBulkEditDataRetentionButton,
    clickEmptyPromptIndexTemplateLink,
    sortTableOnStorageSize,
    sortTableOnName,
  };
};

/**
 * Actions for data stream detail panel.
 */
export const createDataStreamDetailPanelActions = () => {
  const findDetailPanel = () => {
    return screen.queryByTestId('dataStreamDetailPanel');
  };

  const findDetailPanelTitle = () => {
    return screen.getByTestId('dataStreamDetailPanelTitle').textContent;
  };

  const findIlmPolicyLink = () => {
    return screen.queryByTestId('ilmPolicyLink');
  };

  const findIndexTemplateLink = () => {
    return screen.queryByTestId('indexTemplateLink');
  };

  const findIlmPolicyDetail = () => {
    return screen.queryByTestId('ilmPolicyDetail');
  };

  const findDataRetentionDetail = () => {
    return screen.queryByTestId('dataRetentionDetail');
  };

  const findFailureStoreDetail = () => {
    return screen.queryByTestId('failureStoreDetail');
  };

  const findFailureStoreRetentionDetail = () => {
    return screen.queryByTestId('failureStoreRetentionDetail');
  };

  const clickIndexTemplateLink = () => {
    const link = screen.getByTestId('indexTemplateLink');
    fireEvent.click(link);
  };

  return {
    findDetailPanel,
    findDetailPanelTitle,
    findIlmPolicyLink,
    findIndexTemplateLink,
    findIlmPolicyDetail,
    findDataRetentionDetail,
    findFailureStoreDetail,
    findFailureStoreRetentionDetail,
    clickIndexTemplateLink,
  };
};

/**
 * Form actions for data retention modal.
 */
export const createDataRetentionFormActions = () => {
  const setDataRetentionValue = (value: string) => {
    const input = screen.getByTestId('dataRetentionValue');
    fireEvent.change(input, { target: { value } });
  };

  const toggleDataRetentionEnabled = () => {
    const toggle = screen.getByTestId('dataRetentionEnabledField');
    const input = within(toggle).getByRole('switch');
    fireEvent.click(input);
  };

  const toggleInfiniteRetentionPeriod = () => {
    const toggle = screen.getByTestId('infiniteRetentionPeriod');
    const input = within(toggle).getByRole('switch');
    fireEvent.click(input);
  };

  const setTimeUnit = async (unit: 'd' | 'h' | 'm' | 's') => {
    // Open the unit dropdown (show-filters-button)
    const showFiltersButton = screen.getByTestId('show-filters-button');
    fireEvent.click(showFiltersButton);
    // Wait for and click the option
    const option = await screen.findByTestId(`filter-option-${unit}`);
    fireEvent.click(option);
  };

  const clickSaveButton = () => {
    fireEvent.click(screen.getByTestId('saveButton'));
  };

  const clickCancelButton = () => {
    fireEvent.click(screen.getByTestId('cancelButton'));
  };

  const getReducedRetentionCalloutText = () => {
    return screen.queryByTestId('reducedDataRetentionCallout')?.textContent;
  };

  return {
    setDataRetentionValue,
    toggleDataRetentionEnabled,
    toggleInfiniteRetentionPeriod,
    setTimeUnit,
    clickSaveButton,
    clickCancelButton,
    getReducedRetentionCalloutText,
  };
};

/**
 * Factory functions for test data.
 */
export const createDataStreamPayload = (dataStream: Partial<DataStream> = {}): DataStream => ({
  name: 'my-data-stream',
  timeStampField: { name: '@timestamp' },
  indices: [
    {
      name: 'indexName',
      uuid: 'indexId',
      preferILM: false,
      managedBy: 'Data stream lifecycle',
    },
  ],
  generation: 1,
  nextGenerationManagedBy: 'Data stream lifecycle',
  health: 'green',
  indexTemplateName: 'indexTemplate',
  storageSize: '1b',
  storageSizeBytes: 1,
  maxTimeStamp: 420,
  privileges: {
    delete_index: true,
    manage_data_stream_lifecycle: true,
    read_failure_store: true,
  },
  hidden: false,
  lifecycle: {
    enabled: true,
    data_retention: '7d',
  },
  failureStoreRetention: {
    defaultRetentionPeriod: '30d',
  },
  indexMode: 'standard',
  ...dataStream,
});

export const createDataStreamBackingIndex = (indexName: string, dataStreamName: string) => ({
  health: '',
  status: '',
  primary: '',
  replica: '',
  documents: '',
  documents_deleted: '',
  size: '',
  primary_size: '',
  name: indexName,
  data_stream: dataStreamName,
});

export const createNonDataStreamIndex = (name: string) => ({
  health: 'green',
  status: 'open',
  primary: 1,
  replica: 1,
  documents: 10000,
  documents_deleted: 100,
  size: '156kb',
  primary_size: '156kb',
  name,
});
