/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import { AlertSummaryApi } from '../services/alert_summary_api';
import { alertSummaryKeys } from './query_key_factory';

export interface UseFetchAlertSummaryParams {
  /** Rule ids to aggregate across. May be empty; empty short-circuits to zeros. */
  ruleIds: string[];
  /** Inclusive start of the time range, ISO-8601. */
  gte: string;
  /** Inclusive end of the time range, ISO-8601. */
  lte: string;
  /** ES|QL time duration literal (e.g. `1 hour`, `30 minutes`). */
  fixedInterval: string;
  /** Override for enabling/disabling the query (useful when inputs are loading). */
  enabled?: boolean;
}

export const useFetchAlertSummary = ({
  ruleIds,
  gte,
  lte,
  fixedInterval,
  enabled = true,
}: UseFetchAlertSummaryParams): UseQueryResult<AlertSummaryResponse, Error> => {
  const alertSummaryApi = useService(AlertSummaryApi);
  const { toasts } = useService(CoreStart('notifications'));

  // Sort ruleIds defensively so two callers passing the same ids in different
  // orders share a cache entry instead of duplicating requests.
  const sortedRuleIds = useMemo(() => [...ruleIds].sort(), [ruleIds]);

  return useQuery({
    queryKey: alertSummaryKeys.query({
      ruleIds: sortedRuleIds,
      gte,
      lte,
      fixed_interval: fixedInterval,
    }),
    queryFn: ({ signal }) =>
      alertSummaryApi.getAlertSummary(
        { ruleIds: sortedRuleIds, gte, lte, fixed_interval: fixedInterval },
        { signal }
      ),
    enabled,
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchAlertSummary.errorMessage', {
          defaultMessage: 'Failed to load alert activity',
        })
      );
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};
