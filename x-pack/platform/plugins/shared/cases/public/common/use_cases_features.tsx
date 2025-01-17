/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SingleCaseMetricsFeature } from '../../common/ui';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useLicense } from './use_license';

export interface UseCasesFeatures {
  isAlertsEnabled: boolean;
  isSyncAlertsEnabled: boolean;
  observablesAuthorized: boolean;
  caseAssignmentAuthorized: boolean;
  pushToServiceAuthorized: boolean;
  metricsFeatures: SingleCaseMetricsFeature[];
}

export const useCasesFeatures = (): UseCasesFeatures => {
  const {
    features,
    permissions: { assign },
  } = useCasesContext();
  const { isAtLeastPlatinum } = useLicense();
  const hasLicenseGreaterThanPlatinum = isAtLeastPlatinum();

  const casesFeatures = useMemo(
    () => ({
      isAlertsEnabled: features.alerts.enabled,
      /**
       * If the alerts feature is disabled we will disable everything.
       * If not, then we honor the sync option.
       * The sync and enabled option in DEFAULT_FEATURES in x-pack/plugins/cases/common/constants.ts
       * is defaulted to true. This will help consumers to set the enabled
       * option to true and get the whole alerts experience without the need
       * to explicitly set the sync to true
       */
      isSyncAlertsEnabled: !features.alerts.enabled ? false : features.alerts.sync,
      metricsFeatures: features.metrics,
      caseAssignmentAuthorized: hasLicenseGreaterThanPlatinum && assign,
      pushToServiceAuthorized: hasLicenseGreaterThanPlatinum,
      observablesAuthorized: hasLicenseGreaterThanPlatinum,
    }),
    [
      features.alerts.enabled,
      features.alerts.sync,
      features.metrics,
      hasLicenseGreaterThanPlatinum,
      assign,
    ]
  );

  return casesFeatures;
};
