/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { useExportResults } from '../../results/use_export_results';
import { useExportFilters } from '../../results/export_filters_context';
import { RowKebabMenu } from './row_kebab_menu';

jest.mock('../../common/experimental_features_context');
jest.mock('../../results/use_export_results');
jest.mock('../../results/export_filters_context');
jest.mock('../../cases/add_to_cases', () => ({
  AddToCaseContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../cases/add_to_cases_button', () => ({
  AddToCaseButton: () => null,
}));
jest.mock('../../timelines/add_to_timeline_button', () => ({
  AddToTimelineButton: () => null,
}));
jest.mock('../../shared_components/attachments/pack_queries_attachment_wrapper', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');

  return { CasesAttachmentWrapperContext: createContext(false) };
});

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;
const useExportResultsMock = useExportResults as jest.MockedFunction<typeof useExportResults>;
const useExportFiltersMock = useExportFilters as jest.MockedFunction<typeof useExportFilters>;

const defaultExportMock = {
  exportResults: jest.fn().mockResolvedValue(undefined),
  isExporting: false,
};

const renderKebab = (props: Partial<React.ComponentProps<typeof RowKebabMenu>> = {}) =>
  render(
    <I18nProvider>
      <RowKebabMenu
        row={{ action_id: 'row-action-id', id: 'row-1' }}
        actionId="parent-action-id"
        {...props}
      />
    </I18nProvider>
  );

describe('RowKebabMenu — export branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useExportResultsMock.mockReturnValue(defaultExportMock);
    useExportFiltersMock.mockReturnValue(undefined);
  });

  describe('scheduleId path', () => {
    it('passes scheduleId and executionCount to useExportResults', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      render(
        <I18nProvider>
          <RowKebabMenu
            row={{ action_id: 'row-action-id', id: 'row-sched' }}
            actionId="parent-action-id"
            scheduleId="schedule-abc"
            executionCount={3}
          />
        </I18nProvider>
      );

      expect(useExportResultsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: 'schedule-abc',
          executionCount: 3,
          isLive: false,
        })
      );
    });
  });

  describe('menu item visibility', () => {
    it('shows Export results menu item when exportResults flag is enabled and action_id is present', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      expect(screen.getByTestId('osqueryExportResultsMenuItem')).toBeInTheDocument();
    });

    it('does not show Export results menu item when exportResults flag is disabled', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      expect(screen.queryByTestId('osqueryExportResultsMenuItem')).not.toBeInTheDocument();
    });

    it('does not show Export results menu item when row.action_id is absent', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      renderKebab({ row: { id: 'row-2' } });

      // Kebab renders but export item is guarded by row.action_id
      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-2'));
      expect(screen.queryByTestId('osqueryExportResultsMenuItem')).not.toBeInTheDocument();
    });

    it('renders nothing when no menu items are available (export disabled, no action_id)', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      // No action_id means timeline button is hidden; no actionId prop means cases button is hidden;
      // export flag off means export item is hidden — all three conditions produce an empty menu.
      const { container } = render(
        <I18nProvider>
          <RowKebabMenu row={{ id: 'row-empty' }} actionId={undefined} />
        </I18nProvider>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('export modal lifecycle', () => {
    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
    });

    it('opens the export modal when Export results is clicked', () => {
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      expect(screen.getByTestId('osqueryExportResultsModal')).toBeInTheDocument();
    });

    it('closes the export modal when Cancel is clicked', () => {
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));
      expect(screen.getByTestId('osqueryExportResultsModal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('osqueryExportCancelButton'));
      expect(screen.queryByTestId('osqueryExportResultsModal')).not.toBeInTheDocument();
    });
  });

  describe('filter state wiring', () => {
    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
    });

    it('passes hasActiveFilters=false when no export filters exist', () => {
      useExportFiltersMock.mockReturnValue(undefined);
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      const checkbox = screen.getByTestId('osqueryExportFilteredCheckbox');
      expect(checkbox).toBeDisabled();
    });

    it('passes hasActiveFilters=true when context provides a kuery', () => {
      useExportFiltersMock.mockReturnValue({ kuery: 'host.name:foo', filteredTotal: 5 });
      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      const checkbox = screen.getByTestId('osqueryExportFilteredCheckbox');
      expect(checkbox).not.toBeDisabled();
    });
  });

  describe('export invocation', () => {
    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
    });

    it('calls exportResults with filters when "Only export filtered" is checked', () => {
      useExportFiltersMock.mockReturnValue({
        kuery: 'process.name:bash',
        activeFilters: [],
        filteredTotal: 10,
        total: 50,
      });

      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));
      fireEvent.click(screen.getByTestId('osqueryExportConfirmButton'));

      expect(defaultExportMock.exportResults).toHaveBeenCalledWith('csv', {
        kuery: 'process.name:bash',
        esFilters: undefined,
      });
    });

    it('calls exportResults without filters when "Only export filtered" is unchecked', () => {
      useExportFiltersMock.mockReturnValue({
        kuery: 'host.os:linux',
        filteredTotal: 20,
        total: 100,
      });

      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('JSON'));
      fireEvent.click(screen.getByTestId('osqueryExportConfirmButton'));

      expect(defaultExportMock.exportResults).toHaveBeenCalledWith('json', undefined);
    });

    it('forwards total to the modal so the button reflects unfiltered count when unchecked', () => {
      useExportFiltersMock.mockReturnValue({
        kuery: 'host.os:linux',
        filteredTotal: 20,
        total: 100,
      });

      renderKebab();

      fireEvent.click(screen.getByTestId('packQueriesTableKebab-row-1'));
      fireEvent.click(screen.getByTestId('osqueryExportResultsMenuItem'));

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));

      expect(screen.getByTestId('osqueryExportConfirmButton')).toHaveTextContent('Export 100');
    });
  });
});
