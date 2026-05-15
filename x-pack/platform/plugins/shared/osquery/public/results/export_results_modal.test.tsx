/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ExportResultsModal } from './export_results_modal';

const renderModal = (props: Partial<React.ComponentProps<typeof ExportResultsModal>> = {}) => {
  const onClose = jest.fn();
  const onExport = jest.fn();

  render(
    <I18nProvider>
      <ExportResultsModal onClose={onClose} onExport={onExport} isExporting={false} {...props} />
    </I18nProvider>
  );

  return { onClose, onExport };
};

describe('ExportResultsModal', () => {
  describe('rendering', () => {
    it('renders the modal with title, format select, and footer buttons', () => {
      renderModal();

      expect(screen.getByTestId('osqueryExportResultsModal')).toBeInTheDocument();
      expect(screen.getByText('Export results')).toBeInTheDocument();
      expect(screen.getByTestId('osqueryExportFormatSelect')).toBeInTheDocument();
      expect(screen.getByTestId('osqueryExportCancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('osqueryExportConfirmButton')).toBeInTheDocument();
    });

    it('disables the Export button until a format is picked (no default selection)', () => {
      renderModal();

      const confirm = screen.getByTestId('osqueryExportConfirmButton');
      expect(confirm).toBeDisabled();
    });
  });

  describe('format selection', () => {
    it('opens the dropdown and exposes CSV / NDJSON / JSON options', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));

      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('NDJSON')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    it('enables Export and emits the picked format on confirm', () => {
      const { onExport } = renderModal();

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));

      const confirm = screen.getByTestId('osqueryExportConfirmButton');
      expect(confirm).not.toBeDisabled();

      fireEvent.click(confirm);

      expect(onExport).toHaveBeenCalledWith('csv', { filtered: false });
    });
  });

  describe('filtered checkbox', () => {
    it('renders the checkbox disabled with a tooltip when no filters are active', () => {
      renderModal({ hasActiveFilters: false });

      const checkbox = screen.getByTestId('osqueryExportFilteredCheckbox');
      expect(checkbox).toBeDisabled();
      expect(screen.getByTestId('osqueryExportFilteredCheckboxTooltip')).toBeInTheDocument();
    });

    it('renders the checkbox enabled and pre-checked when filters are active', () => {
      renderModal({ hasActiveFilters: true });

      const checkbox = screen.getByTestId('osqueryExportFilteredCheckbox');
      expect(checkbox).not.toBeDisabled();
      expect(checkbox).toBeChecked();
    });

    it('emits filtered:true when checkbox is checked and Export is confirmed', () => {
      const { onExport } = renderModal({ hasActiveFilters: true });

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('NDJSON'));

      fireEvent.click(screen.getByTestId('osqueryExportConfirmButton'));

      expect(onExport).toHaveBeenCalledWith('ndjson', { filtered: true });
    });

    it('emits filtered:false when the user unchecks the box', () => {
      const { onExport } = renderModal({ hasActiveFilters: true });

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));
      fireEvent.click(screen.getByTestId('osqueryExportConfirmButton'));

      expect(onExport).toHaveBeenCalledWith('csv', { filtered: false });
    });
  });

  describe('large export warning', () => {
    it('does not render the warning below the threshold', () => {
      renderModal({ filteredTotal: 50_000 });

      expect(screen.queryByTestId('osqueryExportLargeWarning')).not.toBeInTheDocument();
    });

    it('renders the warning exactly at the threshold (100k rows)', () => {
      // hasActiveFilters=true so the filtered checkbox starts checked and
      // `exportCount` resolves to `filteredTotal`. Without filters, the
      // unfiltered path applies and would need `total` instead.
      renderModal({ hasActiveFilters: true, filteredTotal: 100_000 });

      expect(screen.getByTestId('osqueryExportLargeWarning')).toBeInTheDocument();
    });

    it('renders the warning above the threshold', () => {
      renderModal({ hasActiveFilters: true, filteredTotal: 250_000 });

      expect(screen.getByTestId('osqueryExportLargeWarning')).toBeInTheDocument();
    });

    it('renders the warning when no filters are active and total exceeds the threshold', () => {
      renderModal({ hasActiveFilters: false, total: 250_000 });

      expect(screen.getByTestId('osqueryExportLargeWarning')).toBeInTheDocument();
    });

    it('renders the warning when unfiltered total exceeds the threshold and the box is unchecked', () => {
      renderModal({ hasActiveFilters: true, filteredTotal: 50_000, total: 200_000 });

      expect(screen.queryByTestId('osqueryExportLargeWarning')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));

      expect(screen.getByTestId('osqueryExportLargeWarning')).toBeInTheDocument();
    });
  });

  describe('cancel', () => {
    it('calls onClose when Cancel is clicked', () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByTestId('osqueryExportCancelButton'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('row count in button label', () => {
    it('shows the unfiltered total when filtered checkbox is unchecked', () => {
      renderModal({ hasActiveFilters: true, filteredTotal: 12, total: 999 });

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));
      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));

      expect(screen.getByTestId('osqueryExportConfirmButton')).toHaveTextContent('Export 999');
    });

    it('shows the filtered total when filtered checkbox is checked', () => {
      renderModal({ hasActiveFilters: true, filteredTotal: 12, total: 999 });

      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));

      expect(screen.getByTestId('osqueryExportConfirmButton')).toHaveTextContent('Export 12');
    });

    it('falls back to plain "Export" when total is undefined and the user unchecks the filtered box', () => {
      // Race condition: unfiltered total is still loading when the user opens
      // the modal and unchecks "Only export filtered results". The button must
      // NOT show the filtered count — that would mislead the user about how
      // many rows the unfiltered export will return.
      renderModal({ hasActiveFilters: true, filteredTotal: 12, total: undefined });

      fireEvent.click(screen.getByTestId('osqueryExportFilteredCheckbox'));
      fireEvent.click(screen.getByTestId('osqueryExportFormatSelect'));
      fireEvent.click(screen.getByText('CSV'));

      const confirm = screen.getByTestId('osqueryExportConfirmButton');
      expect(confirm).toHaveTextContent('Export');
      expect(confirm).not.toHaveTextContent('Export 12');
    });
  });

  describe('isExporting', () => {
    it('disables the Export button while exporting', () => {
      renderModal({ isExporting: true });

      const confirm = screen.getByTestId('osqueryExportConfirmButton');
      expect(confirm).toBeDisabled();
    });
  });
});
