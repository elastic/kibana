/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { KueryNode } from '@kbn/es-query';
import type { RuleHealthResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/health';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface RuleHealthReasonCount {
  reason: string;
  count: number;
}

export interface RuleHealthErrorMessage extends RuleHealthReasonCount {
  message: string;
}

export interface RuleHealth {
  total: number;
  byOutcome: Record<string, number>;
  byStatus: Record<string, number>;
  byErrorReason: RuleHealthReasonCount[];
  byWarningReason: RuleHealthReasonCount[];
  topErrorMessages: RuleHealthErrorMessage[];
  /** Rules whose last run failed because Elasticsearch rejected their API key, with the distinct messages seen. */
  apiKeyError: { count: number; messages: string[] };
  missingApiKey: { count: number };
}

export interface LoadRuleHealthProps {
  http: HttpSetup;
  ruleTypeIds?: string[];
  consumers?: string[];
  filter?: KueryNode;
}

export const rewriteRuleHealthResponse = ({
  total,
  by_outcome: byOutcome,
  by_status: byStatus,
  by_error_reason: byErrorReason,
  by_warning_reason: byWarningReason,
  top_error_messages: topErrorMessages,
  api_key_error: apiKeyError,
  missing_api_key: missingApiKey,
}: RuleHealthResponseBody): RuleHealth => ({
  total,
  byOutcome,
  byStatus,
  byErrorReason,
  byWarningReason,
  topErrorMessages,
  apiKeyError,
  missingApiKey,
});

export const loadRuleHealth = async ({
  http,
  ruleTypeIds,
  consumers,
  filter,
}: LoadRuleHealthProps): Promise<RuleHealth> => {
  const res = await http.post<RuleHealthResponseBody>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_health`,
    {
      body: JSON.stringify({
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        rule_type_ids: ruleTypeIds,
        consumers,
        default_search_operator: 'AND',
      }),
    }
  );
  return rewriteRuleHealthResponse(res);
};
