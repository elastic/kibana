/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesFeatures } from '../../common/use_cases_features';

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
  const { isSyncAlertsEnabled } = useCasesFeatures();

  if (!isSyncAlertsEnabled) {
    return false;
  }

  if ('selectedCases' in params) {
    return params.selectedCases.some(
      (selectedCase) => selectedCase.totalAlerts > 0 && selectedCase.settings.syncAlerts
    );
  }

  return params.totalAlerts > 0 && params.syncAlertsEnabled;
};
