/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiSuperSelect,
  EuiCheckbox,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Threshold above which we surface a size warning in the modal. The server
 * hard-caps exports at 500k rows; warning at 100k keeps low-spec clients from
 * being surprised by a multi-hundred-MB download.
 */
const LARGE_EXPORT_THRESHOLD = 100_000;

import type { ExportFormat } from './use_export_results';

const FORMAT_OPTIONS = [
  {
    value: 'csv',
    inputDisplay: 'CSV',
    dropdownDisplay: 'CSV',
  },
  {
    value: 'ndjson',
    inputDisplay: 'NDJSON',
    dropdownDisplay: 'NDJSON',
  },
  {
    value: 'json',
    inputDisplay: 'JSON',
    dropdownDisplay: 'JSON',
  },
];

export interface ExportResultsModalProps {
  onClose: () => void;
  onExport: (format: ExportFormat, options: { filtered: boolean }) => void;
  isExporting: boolean;
  /** Whether the caller has active filters (KQL or filter pills) */
  hasActiveFilters?: boolean;
  /** Total number of results matching the current filters */
  filteredTotal?: number;
}

const ExportResultsModalComponent: React.FC<ExportResultsModalProps> = ({
  onClose,
  onExport,
  isExporting,
  hasActiveFilters = false,
  filteredTotal,
}) => {
  const [format, setFormat] = useState<string>('csv');
  const [exportFiltered, setExportFiltered] = useState(hasActiveFilters);

  const handleFormatChange = useCallback((value: string) => {
    setFormat(value);
  }, []);

  const handleExport = useCallback(() => {
    if (format) {
      onExport(format as ExportFormat, { filtered: exportFiltered });
    }
  }, [format, onExport, exportFiltered]);

  const handleFilteredToggle = useCallback(() => {
    setExportFiltered((prev) => !prev);
  }, []);

  return (
    <EuiModal onClose={onClose} data-test-subj="osqueryExportResultsModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.osquery.exportModal.title', {
            defaultMessage: 'Export results',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.osquery.exportModal.formatLabel', {
            defaultMessage: 'File format',
          })}
        >
          <EuiSuperSelect
            options={FORMAT_OPTIONS}
            valueOfSelected={format}
            onChange={handleFormatChange}
            data-test-subj="osqueryExportFormatSelect"
          />
        </EuiFormRow>

        {hasActiveFilters && (
          <>
            <EuiSpacer size="m" />
            <EuiCheckbox
              id="export-filtered-results"
              label={i18n.translate('xpack.osquery.exportModal.exportFilteredWithCount', {
                defaultMessage:
                  'Only export {count} filtered {count, plural, one {result} other {results}}',
                values: { count: filteredTotal ?? 0 },
              })}
              checked={exportFiltered}
              onChange={handleFilteredToggle}
              data-test-subj="osqueryExportFilteredCheckbox"
            />
          </>
        )}

        {filteredTotal != null && filteredTotal >= LARGE_EXPORT_THRESHOLD && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              size="s"
              color="warning"
              iconType="warning"
              data-test-subj="osqueryExportLargeWarning"
              title={i18n.translate('xpack.osquery.exportModal.largeExportTitle', {
                defaultMessage: 'Large export ({count} rows)',
                values: { count: filteredTotal },
              })}
            >
              {i18n.translate('xpack.osquery.exportModal.largeExportText', {
                defaultMessage:
                  'This may take several minutes and produce a large file. Narrow the query with filters if possible. Exports above 500,000 rows are rejected — add filters to reduce the result set.',
              })}
            </EuiCallOut>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="osqueryExportCancelButton">
          {i18n.translate('xpack.osquery.exportModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleExport}
          fill
          isLoading={isExporting}
          data-test-subj="osqueryExportConfirmButton"
        >
          {i18n.translate('xpack.osquery.exportModal.export', {
            defaultMessage: 'Export',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const ExportResultsModal = React.memo(ExportResultsModalComponent);
