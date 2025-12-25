/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';

// Convert non breaking spaces (&nbsp;) to ordinary space
export const removeWhiteSpaceOnArrayValues = (array: string[]) =>
  array.map((value) => value.trim().replace(/\s/g, ' '));

export const getTableCellsValues = (tableTestId: string): string[][] =>
  new EuiTableTestHarness(tableTestId).normalizedCellValues;

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

const queryContextMenuItemButton = (label: string): HTMLButtonElement | null => {
  // Avoid `findByText('Edit')` etc since EUI can render multiple "Edit" screen-reader-only spans.
  const candidates = screen.queryAllByText(label);
  const textEl = candidates.find((el) => el.classList.contains('euiContextMenuItem__text'));
  return (textEl?.closest('button') as HTMLButtonElement | null) ?? null;
};

/**
 * Actions for interacting with the index templates tab.
 */
export const createIndexTemplatesTabActions = () => {
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
    fireEvent.click(screen.getByTestId('viewButton'));
    await waitFor(() => {
      expect(screen.getAllByTestId('filterItem').length).toBeGreaterThan(0);
    });
    // Click the appropriate filter item
    const filterItems = screen.getAllByTestId('filterItem');
    fireEvent.click(filterItems[filterIndexMap[filter]]);
    await waitFor(() => {
      expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
    });
  };

  const clickTemplateAt = async (index: number, isLegacy = false) => {
    const tableTestId = isLegacy ? 'legacyTemplateTable' : 'templateTable';
    const dataRow = new EuiTableTestHarness(tableTestId).rows[index];
    if (!dataRow) throw new Error(`Expected row ${index} to exist in table "${tableTestId}"`);
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
    // EUI uses overflow menu with id "<template_name>-actions" when > 2 actions
    const actionsContainer = document.getElementById(`${templateName}-actions`);
    if (!actionsContainer) return;

    fireEvent.click(within(actionsContainer).getByRole('button'));

    // Wait for context menu items to appear
    await waitFor(() => {
      expect(queryContextMenuItemButton('Edit')).toBeTruthy();
    });
  };

  const findActionButton = (action: 'edit' | 'clone' | 'delete'): HTMLElement | null => {
    return queryContextMenuItemButton(getActionLabel(action));
  };

  const clickTemplateAction = async (templateName: string, action: 'edit' | 'clone' | 'delete') => {
    await clickActionMenu(templateName);
    const label = getActionLabel(action);
    const button = await waitFor(() => {
      const el = queryContextMenuItemButton(label);
      if (!el) throw new Error('Context menu item not ready');
      return el;
    });
    fireEvent.click(button);
    await waitFor(() => {
      expect(queryContextMenuItemButton(label)).toBeNull();
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
    selectDetailsTab,
  };
};

export const waitForTemplateListToLoad = async () => {
  await screen.findByTestId('templateList');
  await waitFor(() => {
    expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
  });
};
