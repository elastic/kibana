/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { ExportFormat } from './use_export_results';

/**
 * Threshold above which we surface a size warning in the modal. The server
 * hard-caps exports at 500k rows; warning at 100k keeps low-spec clients from
 * being surprised by a multi-hundred-MB download.
 */
const LARGE_EXPORT_THRESHOLD = 100_000;

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
  /** Total number of results regardless of filters; used when the filtered checkbox is unchecked. */
  total?: number;
}

const ExportResultsModalComponent: React.FC<ExportResultsModalProps> = ({
  onClose,
  onExport,
  isExporting,
  hasActiveFilters = false,
  filteredTotal,
  total,
}) => {
  const [format, setFormat] = useState<string | undefined>(undefined);
  const [exportFiltered, setExportFiltered] = useState(hasActiveFilters);
  const modalTitleId = useGeneratedHtmlId();

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

  const tooltipAnchorProps = useMemo(
    () => ({ 'data-test-subj': 'osqueryExportFilteredCheckboxTooltip' } as const),
    []
  );

  const exportCount = useMemo(
    () => (exportFiltered ? filteredTotal : total),
    [exportFiltered, filteredTotal, total]
  );

  const exportButtonLabel = useMemo(
    () =>
      exportCount != null
        ? i18n.translate('xpack.osquery.exportModal.exportWithCount', {
            defaultMessage: 'Export {count} {count, plural, one {row} other {rows}}',
            values: { count: exportCount },
          })
        : i18n.translate('xpack.osquery.exportModal.export', {
            defaultMessage: 'Export',
          }),
    [exportCount]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      data-test-subj="osqueryExportResultsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
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
            placeholder={i18n.translate('xpack.osquery.exportModal.formatPlaceholder', {
              defaultMessage: 'Select',
            })}
            data-test-subj="osqueryExportFormatSelect"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <EuiToolTip
          content={
            hasActiveFilters
              ? undefined
              : i18n.translate('xpack.osquery.exportModal.exportFilteredDisabledTooltip', {
                  defaultMessage:
                    'Apply a search query or filter to enable exporting only filtered results.',
                })
          }
          anchorProps={tooltipAnchorProps}
        >
          <EuiCheckbox
            id="export-filtered-results"
            label={i18n.translate('xpack.osquery.exportModal.exportFiltered', {
              defaultMessage: 'Only export filtered results',
            })}
            checked={hasActiveFilters && exportFiltered}
            onChange={handleFilteredToggle}
            disabled={!hasActiveFilters}
            data-test-subj="osqueryExportFilteredCheckbox"
          />
        </EuiToolTip>

        {exportCount != null && exportCount >= LARGE_EXPORT_THRESHOLD && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType="warning"
              data-test-subj="osqueryExportLargeWarning"
              title={i18n.translate('xpack.osquery.exportModal.largeExportTitle', {
                defaultMessage: 'Large export ({count} rows)',
                values: { count: exportCount },
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
          isDisabled={!format}
          data-test-subj="osqueryExportConfirmButton"
        >
          {exportButtonLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const ExportResultsModal = React.memo(ExportResultsModalComponent);
