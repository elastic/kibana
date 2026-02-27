/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesContext } from '../cases_context/use_cases_context';

interface CaseSyncSettings {
  syncAlerts: boolean;
}

interface CaseSyncInfo {
  totalAlerts: number;
  settings: CaseSyncSettings;
}

interface SingleCaseParams {
  totalAlerts: number;
  syncAlertsEnabled: boolean;
}

interface BulkCaseParams {
  selectedCases: CaseSyncInfo[];
}

type UseCanSyncCloseReasonToAlertsParams = SingleCaseParams | BulkCaseParams;

export const useCanSyncCloseReasonToAlerts = (
  params: UseCanSyncCloseReasonToAlertsParams
): boolean => {
  const { features } = useCasesContext();

  if (!features.alerts.sync) {
    return false;
  }

  if ('selectedCases' in params) {
    return params.selectedCases.some(
      (selectedCase) => selectedCase.totalAlerts > 0 && selectedCase.settings.syncAlerts
    );
  }

  return params.totalAlerts > 0 && params.syncAlertsEnabled;
};
