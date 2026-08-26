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

export const useCasesFeatures = (): UseCasesFeatures => {
  const {
    features,
    permissions: { assign },
  } = useCasesContext();
  const { isAtLeastGold, isAtLeastPlatinum } = useLicense();
  const hasLicenseGreaterThanPlatinum = isAtLeastPlatinum();
  const hasLicenseWithAtLeastGold = isAtLeastGold();
  const casesFeatures = useMemo(() => {
    const isSyncAlertsEnabled =
      !features.alerts.enabled || !features.alerts.all ? false : features.alerts.sync;
    const observablesAuthorized = hasLicenseGreaterThanPlatinum;
    const isExtractObservablesEnabled =
      !!features.observables.enabled && !!features.observables.autoExtract;
    const metricsFeatures = features.metrics;

    return {
      isAlertsEnabled: features.alerts.enabled,
      /**
       * If the alerts feature is disabled we will disable everything.
       * If not, then we honor the sync option.
       * The sync and enabled option in DEFAULT_FEATURES in x-pack/plugins/cases/common/constants.ts
       * is defaulted to true. This will help consumers to set the enabled
       * option to true and get the whole alerts experience without the need
       * to explicitly set the sync to true
       */
      isSyncAlertsEnabled,
      metricsFeatures,
      caseAssignmentAuthorized: hasLicenseGreaterThanPlatinum && assign,
      pushToServiceAuthorized: hasLicenseGreaterThanPlatinum,
      observablesAuthorized,
      connectorsAuthorized: hasLicenseWithAtLeastGold,
      isObservablesFeatureEnabled: !!features.observables.enabled,
      isExtractObservablesEnabled,
      // Mirrors the switches shown by CaseSettingsPopover: sync alerts, observable extraction
      // (license-gated), or metrics. Keep in sync with that component's render conditions.
      hasCaseSettings:
        isSyncAlertsEnabled ||
        (observablesAuthorized && isExtractObservablesEnabled) ||
        metricsFeatures.length > 0,
    };
  }, [
    features.alerts.enabled,
    features.alerts.sync,
    features.alerts.all,
    features.metrics,
    hasLicenseGreaterThanPlatinum,
    assign,
    features.observables?.enabled,
    features.observables?.autoExtract,
    hasLicenseWithAtLeastGold,
  ]);

  return casesFeatures;
};
