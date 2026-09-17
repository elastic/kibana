/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoData, Recovery } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { FormValues, RuleNoData, RuleRecovery } from '../types';

type LifecycleFormValues = Pick<FormValues, 'kind' | 'recovery' | 'noData'>;

/** Projects the widened form `recovery` onto the API union. Signal rules carry none. */
export const formRecoveryToApiRecovery = (
  values: Pick<LifecycleFormValues, 'kind' | 'recovery'>
): Recovery | undefined => {
  const { kind, recovery } = values;
  if (kind !== 'alert' || !recovery) return undefined;

  switch (recovery.strategy) {
    case recoveryStrategy.condition:
      return { strategy: recoveryStrategy.condition, segment: recovery.segment ?? '' };
    case recoveryStrategy.query:
      return { strategy: recoveryStrategy.query, query: recovery.query ?? '' };
    case recoveryStrategy.manual:
      return { strategy: recoveryStrategy.manual };
    default:
      return { strategy: recoveryStrategy.no_breach };
  }
};

/** Widens the API `recovery` union into form state. */
export const apiRecoveryToFormRecovery = (
  recovery: Recovery | undefined
): RuleRecovery | undefined => {
  if (!recovery) return undefined;
  if (recovery.strategy === recoveryStrategy.condition) {
    return { strategy: recovery.strategy, segment: recovery.segment };
  }
  if (recovery.strategy === recoveryStrategy.query) {
    return { strategy: recovery.strategy, query: recovery.query };
  }
  return { strategy: recovery.strategy };
};

/** Projects the widened form `noData` onto the API union. Signal rules carry none. */
export const formNoDataToApiNoData = (
  values: Pick<LifecycleFormValues, 'kind' | 'noData'>
): NoData | undefined => {
  const { kind, noData } = values;
  if (kind !== 'alert' || !noData) return undefined;

  switch (noData.strategy) {
    case noDataStrategy.keep_last:
    case noDataStrategy.resolve:
    case noDataStrategy.alert:
      return {
        strategy: noData.strategy,
        ...(noData.query?.trim() ? { query: noData.query } : {}),
      };
    default:
      return { strategy: noDataStrategy.ignore };
  }
};

/** Widens the API `no_data` union into form state. */
export const apiNoDataToFormNoData = (noData: NoData | undefined): RuleNoData | undefined => {
  if (!noData) return undefined;
  if (noData.strategy === noDataStrategy.ignore) return { strategy: noData.strategy };
  return { strategy: noData.strategy, ...(noData.query ? { query: noData.query } : {}) };
};

/**
 * True when the rule can recover on its own. Recovery-transition thresholds are
 * inert otherwise, so callers use this to decide whether to emit them.
 */
export const isRecoveryEnabled = (
  values: Pick<LifecycleFormValues, 'kind' | 'recovery'>
): boolean => {
  const recovery = formRecoveryToApiRecovery(values);
  return recovery != null && recovery.strategy !== recoveryStrategy.manual;
};
