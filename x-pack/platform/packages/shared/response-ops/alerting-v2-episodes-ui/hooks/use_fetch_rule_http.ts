/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { queryKeys } from '../query_keys';

export interface UseFetchRuleOptions {
  http: HttpStart;
  ruleId: string | undefined;
  toastDanger?: (message: string) => void;
}

/**
 * Fetches a single alerting v2 rule
 */
export const useFetchRule = ({ http, ruleId, toastDanger }: UseFetchRuleOptions) => {
  return useQuery({
    queryKey: queryKeys.rule(ruleId ?? ''),
    queryFn: () =>
      http.get<RuleResponse>(
        `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId as string)}`
      ),
    enabled: Boolean(ruleId),
    onError: () => {
      toastDanger?.(
        i18n.translate('xpack.alertingV2EpisodesUi.hooks.useFetchRuleHttp.errorMessage', {
          defaultMessage: 'Failed to load rule',
        })
      );
    },
  });
};
