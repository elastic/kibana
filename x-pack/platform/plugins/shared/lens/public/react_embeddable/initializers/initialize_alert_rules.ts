/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFormData } from '@kbn/response-ops-rule-form';
import { ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { getDateRange } from '@kbn/timerange';
import { TimeRange } from '@kbn/es-query';
import { unitsMap } from '@kbn/datemath';
import type { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import type { LensAlertRulesApi, LensInternalApi } from '../types';

export function initializeAlertRules(
  { alertRuleInitialValues$, isRuleFormVisible$, alertingTypeRegistries$ }: LensInternalApi,
  parentApi: unknown
): { api: LensAlertRulesApi } {
  return {
    api: {
      createAlertRule: (
        initialValues: Partial<RuleFormData>,
        ruleTypeRegistry: RuleTypeRegistry,
        actionTypeRegistry: ActionTypeRegistryContract
      ) => {
        const { timeRange$ } = apiPublishesUnifiedSearch(parentApi)
          ? parentApi
          : { timeRange$: undefined };
        const timeRange = timeRange$?.getValue();
        if (timeRange) {
          alertRuleInitialValues$.next({
            params: {
              ...initialValues.params,
              ...timeRangeToNearestTimeWindow(timeRange),
            },
          });
        } else {
          alertRuleInitialValues$.next(initialValues);
        }

        alertingTypeRegistries$.next({
          ruleTypeRegistry,
          actionTypeRegistry,
        });
        isRuleFormVisible$.next(true);
      },
    },
  };
}

function timeRangeToNearestTimeWindow(timeRange: TimeRange) {
  const { startDate, endDate } = getDateRange(timeRange);
  const timeWindow = endDate - startDate;
  const timeWindowUnit =
    timeWindow >= unitsMap.d.base
      ? 'd'
      : timeWindow >= unitsMap.h.base
      ? 'h'
      : timeWindow >= unitsMap.m.base
      ? 'm'
      : 's';
  const timeWindowSize = Math.round(timeWindow / unitsMap[timeWindowUnit].base);

  return { timeWindowUnit, timeWindowSize };
}
