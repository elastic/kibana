/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';

import { useExportResultsAction } from './use_export_results_action';
import { ExportResultsModal } from './export_results_modal';
import { EXPORT_NO_DATA_TOOLTIP } from './translations';

interface ExportResultsButtonProps {
  actionId: string;
  isLive?: boolean;
  liveQueryId?: string;
  scheduleId?: string;
  executionCount?: number;
  kuery?: string;
  activeFilters?: Filter[];
  /** Total under the active KQL/filters; used when "Only export filtered results" is checked. */
  filteredTotal?: number;
  /** Unfiltered total; used when the user opts out of "Only export filtered results". */
  total?: number;
}

const ExportResultsButtonComponent: React.FC<ExportResultsButtonProps> = ({
  actionId,
  isLive = true,
  liveQueryId,
  scheduleId,
  executionCount,
  kuery,
  activeFilters,
  filteredTotal,
  total,
}) => {
  const {
    isExportEnabled,
    isEmpty,
    isInitialLoading,
    isExporting,
    hasActiveFilters,
    isModalOpen,
    openModal,
    closeModal,
    handleExport,
  } = useExportResultsAction({
    actionId,
    isLive,
    liveQueryId,
    scheduleId,
    executionCount,
    kuery,
    activeFilters,
    filteredTotal,
    total,
  });

  if (!isExportEnabled) {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      size="m"
      iconType="upload"
      onClick={openModal}
      isLoading={isExporting || isInitialLoading}
      isDisabled={isEmpty}
      data-test-subj="osqueryExportResultsButton"
    >
      {i18n.translate('xpack.osquery.exportResults.buttonLabel', {
        defaultMessage: 'Export results',
      })}
    </EuiButtonEmpty>
  );

  return (
    <>
      {isEmpty ? <EuiToolTip content={EXPORT_NO_DATA_TOOLTIP}>{button}</EuiToolTip> : button}

      {isModalOpen && (
        <ExportResultsModal
          onClose={closeModal}
          onExport={handleExport}
          isExporting={isExporting}
          hasActiveFilters={hasActiveFilters}
          filteredTotal={filteredTotal}
          total={total}
        />
      )}
    </>
  );
};

export const ExportResultsButton = React.memo(ExportResultsButtonComponent);
