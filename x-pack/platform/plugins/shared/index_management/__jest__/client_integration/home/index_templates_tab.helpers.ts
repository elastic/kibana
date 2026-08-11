/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  EuiContextMenuTestHarness,
  EuiPopoverPanelTestHarness,
  EuiTableTestHarness,
} from '@kbn/test-eui-helpers';
import { closeViewFilterPopoverIfOpen } from '../helpers/actions/popover_cleanup';

// Convert non breaking spaces (&nbsp;) to ordinary space
export const removeWhiteSpaceOnArrayValues = (array: string[]) =>
  array.map((value) => value.trim().replace(/\s/g, ' '));

export const getTableCellsValues = (tableTestId: string): string[][] =>
  new EuiTableTestHarness(tableTestId).getCellValues();

/**
 * Helper to check if an element exists.
 */
export const exists = (testId: string): boolean => screen.queryByTestId(testId) !== null;

const getActionLabel = (action: 'edit' | 'clone' | 'delete') => {
  const labelMap: Record<typeof action, string> = {
    edit: 'Edit',
    clone: 'Clone',
    delete: 'Delete',
  };
  return labelMap[action];
};

const getTemplateRowByName = (templateName: string): HTMLElement => {
  // Try both tables (composable and legacy)
  const composableTable = new EuiTableTestHarness('templateTable');
  if (composableTable.getElement()) {
    const row = composableTable.getRowByCellText(templateName);
    if (row) return row;
  }

  const legacyTable = new EuiTableTestHarness('legacyTemplateTable');
  if (legacyTable.getElement()) {
    const row = legacyTable.getRowByCellText(templateName);
    if (row) return row;
  }

  throw new Error(`Expected template row to exist for "${templateName}"`);
};

/**
 * Actions for interacting with the index templates tab.
 */
export const createIndexTemplatesTabActions = () => {
  let lastRowActionsButton: HTMLButtonElement | null = null;

  const clickReloadButton = () => {
    fireEvent.click(screen.getByTestId('reloadButton'));
  };

  const toggleViewFilter = async (filter: 'managed' | 'deprecated' | 'cloudManaged' | 'system') => {
    const filterIndexMap: Record<string, number> = {
      managed: 0,
      deprecated: 1,
      cloudManaged: 2,
      system: 3,
    };
    // Click the view button to open the filter popover
    const viewButton = screen.getByTestId('viewButton');
    fireEvent.click(viewButton);
    await waitFor(() => {
      expect(screen.getAllByTestId('filterItem').length).toBeGreaterThan(0);
    });
    // Click the appropriate filter item
    const filterItems = screen.getAllByTestId('filterItem');
    fireEvent.click(filterItems[filterIndexMap[filter]]);
    await waitFor(() => {
      expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
    });

    // The filter popover can remain open after selection; close it to avoid leaking
    // popover state across tests (late async updates can cause act() warnings).
    await closeViewFilterPopoverIfOpen();
  };

  const clickTemplateAt = async (index: number, isLegacy = false) => {
    const tableTestId = isLegacy ? 'legacyTemplateTable' : 'templateTable';
    const rows = new EuiTableTestHarness(tableTestId).getRows();
    const dataRow = rows[index] ?? null;
    const templateLink = within(dataRow).getByTestId('templateDetailsLink');
    fireEvent.click(templateLink);
    await screen.findByTestId('templateDetails');
    await waitFor(() => {
      // Either summary tab or error section should be present
      const hasSummaryTab = screen.queryByTestId('summaryTab') !== null;
      const hasSectionError = screen.queryByTestId('sectionError') !== null;
      expect(hasSummaryTab || hasSectionError).toBe(true);
    });
  };

  const clickCloseDetailsButton = async () => {
    fireEvent.click(screen.getByTestId('closeDetailsButton'));
    await waitFor(() => {
      expect(screen.queryByTestId('templateDetails')).not.toBeInTheDocument();
    });
  };

  const clickActionMenu = async (templateName: string) => {
    const row = getTemplateRowByName(templateName);
    // EUI tables typically use an icon button with accessible name "Actions" (fallback: aria-haspopup)
    const buttons = within(row).getAllByRole('button') as HTMLButtonElement[];
    const actionsButton =
      buttons.find((b) =>
        /actions/i.test((b.getAttribute('aria-label') ?? b.textContent ?? '').trim())
      ) ??
      buttons.find((b) => {
        const hasPopup = b.getAttribute('aria-haspopup');
        return typeof hasPopup === 'string' && hasPopup.length > 0;
      });
    if (!actionsButton)
      throw new Error('Expected an actions popover toggle button in the table row');

    lastRowActionsButton = actionsButton;
    fireEvent.click(actionsButton);

    // Wait until the expected menu item exists in an open popover panel
    await new EuiPopoverPanelTestHarness().findContextMenuContainingItem('Edit');
  };

  const findActionButton = (action: 'edit' | 'clone' | 'delete'): HTMLElement | null => {
    const label = getActionLabel(action);
    const panel = new EuiPopoverPanelTestHarness().getTopOpenPanel();
    if (!panel) return null;
    return new EuiContextMenuTestHarness(panel).getMenuItem(label);
  };

  const clickTemplateAction = async (templateName: string, action: 'edit' | 'clone' | 'delete') => {
    const label = getActionLabel(action);
    await clickActionMenu(templateName);

    const menu = await new EuiPopoverPanelTestHarness().findContextMenuContainingItem(label);
    await menu.clickMenuItemAndWaitForClose(label);
  };

  const closeOpenActionMenu = async () => {
    const panel = new EuiPopoverPanelTestHarness().getTopOpenPanel();
    if (!panel) return;

    // Prefer clicking the same toggle button again (most reliable) instead of relying on Escape.
    if (lastRowActionsButton) {
      fireEvent.click(lastRowActionsButton);
    } else {
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    }
    await waitFor(() => {
      expect(new EuiPopoverPanelTestHarness().getTopOpenPanel()).toBeNull();
    });
  };

  const selectDetailsTab = async (
    tab: 'summary' | 'settings' | 'mappings' | 'aliases' | 'preview'
  ) => {
    const tabTestIdMap: Record<string, string> = {
      summary: 'summaryTabBtn',
      settings: 'settingsTabBtn',
      mappings: 'mappingsTabBtn',
      aliases: 'aliasesTabBtn',
      preview: 'previewTabBtn',
    };
    fireEvent.click(screen.getByTestId(tabTestIdMap[tab]));

    const tabContentTestIds: Record<string, string[]> = {
      summary: ['summaryTab'],
      settings: ['settingsTabContent', 'noSettingsCallout'],
      mappings: ['mappingsTabContent', 'noMappingsCallout'],
      aliases: ['aliasesTabContent', 'noAliasesCallout'],
      preview: ['previewTabContent'],
    };
    await waitFor(() => {
      const testIds = tabContentTestIds[tab];
      const found = testIds.some((testId) => screen.queryByTestId(testId) !== null);
      expect(found).toBe(true);
    });
  };

  return {
    clickReloadButton,
    toggleViewFilter,
    clickTemplateAt,
    clickCloseDetailsButton,
    clickActionMenu,
    findActionButton,
    clickTemplateAction,
    closeOpenActionMenu,
    selectDetailsTab,
  };
};

export const waitForTemplateListToLoad = async () => {
  await screen.findByTestId('templateList');
  await waitFor(() => {
    expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
  });
};
