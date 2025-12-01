/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import type { DataStream } from '../../../../common';

/**
 * Helper to extract table cell values from a table element.
 * Returns a 2D array where each inner array represents a row of cell values.
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

  const clickIncludeStatsSwitch = async () => {
    fireEvent.click(screen.getByTestId('includeStatsSwitch'));
    // Wait for the table to be available again after reload
    // The switch triggers a reload which may temporarily unmount the table
    await waitFor(() => {
      expect(screen.getByTestId('dataStreamTable')).toBeInTheDocument();
    });
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
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
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    // Click the filter item at the specified index
    const filterItems = screen.getAllByTestId('filterItem');
    fireEvent.click(filterItems[index]);
    // Flush all pending async operations after filter change
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickNameAt = async (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const nameLink = within(dataRow).getByTestId('nameLink');
    fireEvent.click(nameLink);
    // Note: Timer flush happens in waitForDetailPanel() - don't flush here
  };

  const clickIndicesAt = async (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const indicesLink = within(dataRow).getByTestId('indicesLink');
    fireEvent.click(indicesLink);
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickDeleteActionAt = async (index: number) => {
    const table = screen.getByTestId('dataStreamTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
    const deleteButton = within(dataRow).getByTestId('deleteDataStream');
    fireEvent.click(deleteButton);
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
      await jest.runOnlyPendingTimersAsync(); // Double flush for safety
    });
    // Wait for the confirmation modal to appear
    await screen.findByTestId('deleteDataStreamsConfirmation');
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
    // Wait for the modal to be fully rendered
    await screen.findByTestId('deleteDataStreamsConfirmation');
    const confirmButton = await screen.findByTestId('confirmModalConfirmButton');
    fireEvent.click(confirmButton);
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickDeleteDataStreamButton = async () => {
    fireEvent.click(screen.getByTestId('manageDataStreamButton'));
    fireEvent.click(screen.getByTestId('deleteDataStreamButton'));
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickEditDataRetentionButton = async () => {
    fireEvent.click(screen.getByTestId('manageDataStreamButton'));
    fireEvent.click(screen.getByTestId('editDataRetentionButton'));
    // Wait for modal to be fully rendered, including all EuiPopover components
    await screen.findByTestId('dataRetentionValue');
    // Wait for popover button to be ready (indicates EuiPopover is initialized)
    await screen.findByTestId('show-filters-button');
    // Flush all pending async operations (per wisdom bead guidance)
    // waitFor may not be enough if multiple async operations are queued
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
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
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
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
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickBulkDeleteDataStreamsButton = async () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    // Wait for the popover to open
    await screen.findByTestId('dataStreamActionsContextMenu');
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    // Click the delete button
    fireEvent.click(screen.getByTestId('deleteDataStreamsButton'));
    // Wait for the confirmation modal to appear
    await screen.findByTestId('deleteDataStreamsConfirmation');
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

  const clickBulkEditDataRetentionButton = async () => {
    fireEvent.click(screen.getByTestId('dataStreamActionsPopoverButton'));
    // Wait for the popover to open
    await screen.findByTestId('dataStreamActionsContextMenu');
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    // Click the bulk edit button
    fireEvent.click(screen.getByTestId('bulkEditDataRetentionButton'));
    // Wait for modal to be fully rendered, including all EuiPopover components
    await screen.findByTestId('dataRetentionValue');
    // Wait for popover button to be ready (indicates EuiPopover is initialized)
    await screen.findByTestId('show-filters-button');
    // Flush all pending async operations (per wisdom bead guidance)
    // waitFor may not be enough if multiple async operations are queued
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
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
  /**
   * Waits for detail panel to open and flushes all pending async operations.
   * Use this instead of directly calling screen.findByTestId('dataStreamDetailPanel').
   */
  const waitForDetailPanel = async () => {
    await screen.findByTestId('dataStreamDetailPanel');
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  };

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
    waitForDetailPanel,
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
  const setDataRetentionValue = async (value: string) => {
    const input = await screen.findByTestId('dataRetentionValue');
    fireEvent.change(input, { target: { value } });
  };

  const toggleDataRetentionEnabled = async () => {
    const toggle = await screen.findByTestId('dataRetentionEnabledField');
    const input = within(toggle).getByRole('switch');
    fireEvent.click(input);
  };

  const toggleInfiniteRetentionPeriod = async () => {
    const toggle = await screen.findByTestId('infiniteRetentionPeriod');
    const input = within(toggle).getByRole('switch');
    fireEvent.click(input);
  };

  const setTimeUnit = async (unit: 'd' | 'h' | 'm' | 's') => {
    // Open the unit dropdown (show-filters-button)
    const showFiltersButton = await screen.findByTestId('show-filters-button');
    fireEvent.click(showFiltersButton);
    // Wait for the dropdown/popover to open - EuiPopover renders asynchronously
    // Per wisdom bead: use findBy* for elements inside EuiPopover
    const option = await screen.findByTestId(`filter-option-${unit}`);
    fireEvent.click(option);
    // Wait for dropdown to close
    await waitFor(() => {
      expect(screen.queryByTestId(`filter-option-${unit}`)).not.toBeInTheDocument();
    });
    // Flush all pending async operations (per wisdom bead guidance)
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
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
