/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SingleCaseMetricsFeature } from '../../common/ui';
import { getCaseSettings } from '../../common/utils/case_settings';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useLicense } from './use_license';

export interface UseCasesFeatures {
  isSyncAlertsEnabled: boolean;
  observablesAuthorized: boolean;
  connectorsAuthorized: boolean;
  caseAssignmentAuthorized: boolean;
  pushToServiceAuthorized: boolean;
  metricsFeatures: SingleCaseMetricsFeature[];
  isObservablesFeatureEnabled: boolean;
  isExtractObservablesEnabled: boolean;
  /**
   * True when at least one case setting is available to toggle (alert syncing, observable
   * extraction, or metrics). Mirrors the switches rendered by `CaseSettingsPopover`. When false
   * (e.g. Observability and Stack, which enable none of these), the case settings button and its
   * tour step have nothing to show and should be hidden.
   */
  hasCaseSettings: boolean;
}

/** `caseOwner` overrides the context owner (create form: selected solution when the host did not pin one). */
export const useCasesFeatures = (caseOwner?: string): UseCasesFeatures => {
  const {
    owner,
    features,
    permissions: { assign },
  } = useCasesContext();
  const { isAtLeastGold, isAtLeastPlatinum } = useLicense();
  const hasLicenseGreaterThanPlatinum = isAtLeastPlatinum();
  const hasLicenseWithAtLeastGold = isAtLeastGold();
  const casesFeatures = useMemo(() => {
    const { syncAlerts, extractObservables, observablesEnabled } = getCaseSettings(
      caseOwner || owner[0] || ''
    );
    // `alerts.all` is a host/privilege flag; sync itself comes from OWNER_INFO.
    const isSyncAlertsEnabled = Boolean(features.alerts.all && syncAlerts);
    const observablesAuthorized = hasLicenseGreaterThanPlatinum;
    const metricsFeatures = features.metrics;

    return {
      isSyncAlertsEnabled,
      metricsFeatures,
      caseAssignmentAuthorized: hasLicenseGreaterThanPlatinum && assign,
      pushToServiceAuthorized: hasLicenseGreaterThanPlatinum,
      observablesAuthorized,
      connectorsAuthorized: hasLicenseWithAtLeastGold,
      isObservablesFeatureEnabled: observablesEnabled,
      isExtractObservablesEnabled: extractObservables,
      hasCaseSettings:
        isSyncAlertsEnabled ||
        (observablesAuthorized && extractObservables) ||
        metricsFeatures.length > 0,
    };
  }, [
    caseOwner,
    owner,
    features.alerts.all,
    features.metrics,
    hasLicenseGreaterThanPlatinum,
    assign,
    hasLicenseWithAtLeastGold,
  ]);

  return casesFeatures;
};
