/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { UserCapabilities } from '../services/user_capabilities';
import { EMPTY_VALUE } from '../utils/rule_display';
import { useFetchRuleExecutions } from './use_fetch_rule_executions';

const OUTCOME_LABELS: Record<RuleExecutionOutcome, string> = {
  success: i18n.translate('xpack.alertingV2.ruleLastExecution.success', {
    defaultMessage: 'Succeeded',
  }),
  failure: i18n.translate('xpack.alertingV2.ruleLastExecution.failure', {
    defaultMessage: 'Failed',
  }),
};

const UNAVAILABLE_LABEL = i18n.translate('xpack.alertingV2.ruleLastExecution.unavailable', {
  defaultMessage: 'Unavailable',
});

export interface RuleLastExecution {
  visible: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Unset while loading or hidden, so callers can render it directly. */
  value?: string;
  outcome?: RuleExecutionOutcome;
}

/** Latest execution display for one rule, shared by the details header and the summary flyout. */
export const useRuleLastExecution = (ruleId: string): RuleLastExecution => {
  const visible = useService(UserCapabilities).canRead('executionHistory');
  const { data, isLoading, isError } = useFetchRuleExecutions({
    ruleIds: [ruleId],
    perPage: 1,
    sortField: 'startedAt',
    sortOrder: 'desc',
    enabled: visible,
    // The list query keeps the previous page. This lookup must not: a new rule id
    // would render the previous rule's outcome with isLoading false.
    keepPreviousData: false,
  });
  const loading = visible && isLoading;
  const failed = visible && !loading && isError;
  const outcome = failed || loading || !visible ? undefined : data?.items[0]?.outcome;

  let value: string | undefined;
  if (failed) {
    value = UNAVAILABLE_LABEL;
  } else if (visible && !loading) {
    value = outcome ? OUTCOME_LABELS[outcome] : EMPTY_VALUE;
  }

  return { visible, isLoading: loading, isError: failed, value, outcome };
};
