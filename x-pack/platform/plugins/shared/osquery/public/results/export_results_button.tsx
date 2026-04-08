/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';

import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useExportResults } from './use_export_results';
import { ExportResultsModal } from './export_results_modal';
import type { ExportFormat } from './use_export_results';

interface ExportResultsButtonProps {
  actionId: string;
  isLive?: boolean;
  scheduleId?: string;
  executionCount?: number;
  kuery?: string;
  activeFilters?: Filter[];
  filteredTotal?: number;
}

const ExportResultsButtonComponent: React.FC<ExportResultsButtonProps> = ({
  actionId,
  isLive = true,
  scheduleId,
  executionCount,
  kuery,
  activeFilters,
  filteredTotal,
}) => {
  const isExportEnabled = useIsExperimentalFeatureEnabled('exportResults');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasActiveFilters = !!(kuery || (activeFilters && activeFilters.length > 0));

  const esFilters = useMemo(
    () => (activeFilters && activeFilters.length > 0 ? JSON.stringify(activeFilters) : undefined),
    [activeFilters]
  );

  const { exportResults, isExporting } = useExportResults({
    actionId,
    isLive,
    scheduleId,
    executionCount,
  });

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const handleExport = useCallback(
    (format: ExportFormat, options: { filtered: boolean }) => {
      closeModal();
      exportResults(format, options.filtered ? { kuery, esFilters } : undefined);
    },
    [closeModal, exportResults, kuery, esFilters]
  );

  if (!isExportEnabled) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        size="xs"
        iconType="exportAction"
        onClick={openModal}
        isLoading={isExporting}
        data-test-subj="osqueryExportResultsButton"
      >
        {i18n.translate('xpack.osquery.exportResults.buttonLabel', {
          defaultMessage: 'Export',
        })}
      </EuiButtonEmpty>

      {isModalOpen && (
        <ExportResultsModal
          onClose={closeModal}
          onExport={handleExport}
          isExporting={isExporting}
          hasActiveFilters={hasActiveFilters}
          filteredTotal={filteredTotal}
        />
      )}
    </>
  );
};

export const ExportResultsButton = React.memo(ExportResultsButtonComponent);
