/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { EuiSuperSelectTestHarness, EuiTableTestHarness } from '@kbn/test-eui-helpers';

/**
 * Actions for interacting with the index table.
 */
export const createIndexTableActions = () => {
  const getIncludeHiddenIndicesToggleStatus = () => {
    const toggle = screen.getByTestId('checkboxToggles-includeHiddenIndices');
    return toggle.getAttribute('aria-checked') === 'true';
  };

  const clickIncludeHiddenIndicesToggle = () => {
    fireEvent.click(screen.getByTestId('checkboxToggles-includeHiddenIndices'));
  };

  const clickIndexNameAt = async (index: number) => {
    const rows = new EuiTableTestHarness('indexTable').getRows();
    const dataRow = rows[index] ?? null;
    const indexNameLink = within(dataRow).getByTestId('indexTableIndexNameLink');
    fireEvent.click(indexNameLink);
  };

  const clickDataStreamAt = async (index: number) => {
    const rows = new EuiTableTestHarness('indexTable').getRows();
    const dataRow = rows[index] ?? null;
    const dataStreamLink = within(dataRow).getByTestId('dataStreamLink');
    fireEvent.click(dataStreamLink);
  };

  const dataStreamLinkExistsAt = (index: number) => {
    const rows = new EuiTableTestHarness('indexTable').getRows();
    const dataRow = rows[index] ?? null;
    if (!dataRow) return false;
    return within(dataRow).queryByTestId('dataStreamLink') !== null;
  };

  const selectIndexAt = async (index: number) => {
    const checkboxes = screen.getAllByTestId('indexTableRowCheckbox');
    fireEvent.click(checkboxes[index]);
    // Wait for manage button to appear after selection
    await screen.findByTestId('indexActionsContextMenuButton');
  };

  const clickManageContextMenuButton = async () => {
    // Button should be visible after selecting an index
    const button = await screen.findByTestId('indexActionsContextMenuButton');
    fireEvent.click(button);
    // Wait for popover panel to actually be open
    await waitFor(() => {
      const menu = screen.queryByTestId('indexContextMenu');
      const panel = menu?.closest('[data-popover-panel="true"]');
      expect(panel?.getAttribute('data-popover-open')).toBe('true');
    });
  };

  const clickContextMenuOption = async (optionDataTestSubject: string) => {
    const menu = await screen.findByTestId('indexContextMenu');
    const option = within(menu).getByTestId(optionDataTestSubject);
    fireEvent.click(option);

    // Best-effort cleanup: close the popover if it remains open after the action is chosen.
    const panel = menu.closest('[data-popover-panel="true"]');
    if (panel?.getAttribute('data-popover-open') === 'true') {
      const toggle = screen.queryByTestId('indexActionsContextMenuButton');
      if (toggle) {
        fireEvent.click(toggle);
      } else {
        // If the toggle button is already gone (e.g. due to rerender), try Escape as a fallback.
        fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
      }
      await waitFor(() => {
        const currentMenu = screen.queryByTestId('indexContextMenu');
        const currentPanel = currentMenu?.closest('[data-popover-panel="true"]');
        expect(currentPanel?.getAttribute('data-popover-open')).not.toBe('true');
      });
    }
  };

  const clickModalConfirm = async () => {
    const confirmButton = await screen.findByTestId('confirmModalConfirmButton');
    fireEvent.click(confirmButton);
  };

  return {
    getIncludeHiddenIndicesToggleStatus,
    clickIncludeHiddenIndicesToggle,
    clickIndexNameAt,
    clickDataStreamAt,
    dataStreamLinkExistsAt,
    selectIndexAt,
    clickManageContextMenuButton,
    clickContextMenuOption,
    clickModalConfirm,
  };
};

/**
 * Actions for interacting with create index modal.
 */
export const createCreateIndexActions = () => {
  const clickCreateIndexButton = async () => {
    fireEvent.click(screen.getByTestId('createIndexButton'));
    // Wait for modal to open
    await screen.findByTestId('createIndexNameFieldText');
  };

  const clickCreateIndexCancelButton = async () => {
    fireEvent.click(screen.getByTestId('createIndexCancelButton'));
  };

  const clickCreateIndexSaveButton = async () => {
    // `CreateIndexModal` renders the submit button in the modal footer and wires it via `form=...`
    // (instead of nesting it inside the <form>). In JSDOM, clicking a submit button triggers
    // `requestSubmit`, which throws "Not implemented". We only need the React `onClick` handler,
    // so switch the DOM button type to avoid the native submit behavior.
    const saveButton = screen.getByTestId('createIndexSaveButton') as HTMLButtonElement;
    saveButton.type = 'button';
    fireEvent.click(saveButton);
  };

  const setIndexName = (name: string) => {
    const input = screen.getByTestId('createIndexNameFieldText');
    fireEvent.change(input, { target: { value: name } });
  };

  const selectIndexMode = async (indexModeTestSubj: string) => {
    const indexModeSelect = new EuiSuperSelectTestHarness('indexModeField');
    await indexModeSelect.select(indexModeTestSubj);
  };

  return {
    clickCreateIndexButton,
    clickCreateIndexCancelButton,
    clickCreateIndexSaveButton,
    setIndexName,
    selectIndexMode,
  };
};

/**
 * Actions for data stream detail panel.
 */
export const createDataStreamActions = () => {
  const findDataStreamDetailPanel = () => {
    return screen.queryByTestId('dataStreamDetailPanel');
  };

  const findDataStreamDetailPanelTitle = () => {
    return screen.getByTestId('dataStreamDetailPanelTitle').textContent;
  };

  return {
    findDataStreamDetailPanel,
    findDataStreamDetailPanelTitle,
  };
};
