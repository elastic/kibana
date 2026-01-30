/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { queryKeys } from '../query_keys';
import type { MutedAlerts, ServerError } from '../types';
import type { GetMutedAlertsInstancesByRuleParams } from '../apis/get_muted_alerts_instances_by_rule';
import { getMutedAlertsInstancesByRule } from '../apis/get_muted_alerts_instances_by_rule';

const ERROR_TITLE = i18n.translate('xpack.responseOpsAlertsApis.mutedAlerts.api.get', {
  defaultMessage: 'Error fetching muted alerts data',
});

const getMutedAlerts = ({ http, signal, ruleIds }: GetMutedAlertsInstancesByRuleParams) =>
  getMutedAlertsInstancesByRule({ http, ruleIds, signal }).then(({ data: rules }) =>
    rules?.reduce((mutedAlerts, rule) => {
      mutedAlerts[rule.id] = rule.muted_alert_ids;
      return mutedAlerts;
    }, {} as MutedAlerts)
  );

export interface UseGetMutedAlertsQueryParams {
  ruleIds: string[];
  http: HttpStart;
  notifications: NotificationsStart;
}

export const getKey = queryKeys.getMutedAlerts;

export const useGetMutedAlertsQuery = (
  { ruleIds, http, notifications: { toasts } }: UseGetMutedAlertsQueryParams,
  { enabled }: QueryOptionsOverrides<typeof getMutedAlerts> = {}
) => {
  return useQuery({
    context: AlertsQueryContext,
    queryKey: getKey(ruleIds),
    queryFn: ({ signal }) => getMutedAlerts({ http, signal, ruleIds }),
    onError: (error: ServerError) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: ERROR_TITLE,
        });
      }
    },
    enabled: ruleIds.length > 0 && enabled !== false,
    refetchOnWindowFocus: false,
  });
};
