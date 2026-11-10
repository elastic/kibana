/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useExportResults } from './use_export_results';
import type { ExportFormat } from './use_export_results';

export interface UseExportResultsActionArgs {
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

export interface UseExportResultsActionResult {
  /** `exportResults` experimental flag. */
  isExportEnabled: boolean;
  isEmpty: boolean;
  isInitialLoading: boolean;
  isExporting: boolean;
  hasActiveFilters: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  handleExport: (format: ExportFormat, options: { filtered: boolean }) => void;
}

/**
 * Drives "Export results": the experimental-flag gate, loading/empty states, and the
 * format/options modal, reused by `ExportResultsButton` (rendered variant) and the results
 * page's "Export results" menu item.
 */
export const useExportResultsAction = ({
  actionId,
  isLive = true,
  liveQueryId,
  scheduleId,
  executionCount,
  kuery,
  activeFilters,
  total,
}: UseExportResultsActionArgs): UseExportResultsActionResult => {
  const isExportEnabled = useIsExperimentalFeatureEnabled('exportResults');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasActiveFilters = !!(kuery || (activeFilters && activeFilters.length > 0));

  const esFilters = useMemo(
    () => (activeFilters && activeFilters.length > 0 ? activeFilters : undefined),
    [activeFilters]
  );

  const { exportResults, isExporting } = useExportResults({
    actionId,
    isLive,
    liveQueryId,
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

  const isEmpty = total === 0;
  const isInitialLoading = total === undefined;

  // Memoized so the results page's app menu (which depends on this object) stays stable between
  // renders, e.g. while live results poll.
  return useMemo(
    () => ({
      isExportEnabled,
      isEmpty,
      isInitialLoading,
      isExporting,
      hasActiveFilters,
      isModalOpen,
      openModal,
      closeModal,
      handleExport,
    }),
    [
      closeModal,
      handleExport,
      hasActiveFilters,
      isEmpty,
      isExportEnabled,
      isExporting,
      isInitialLoading,
      isModalOpen,
      openModal,
    ]
  );
};
