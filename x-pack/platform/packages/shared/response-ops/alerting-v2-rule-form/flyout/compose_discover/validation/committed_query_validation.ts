/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../../../form/types';
import { getBreachQuery } from '../../../form/utils/query_helpers';
import { getEsqlSummaryState } from '../compose_discover_form/esql_query_summary_section';

const QUERY_REQUIRED_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.queryRequiredError',
  { defaultMessage: 'Define a query in the editor before continuing' }
);

const NO_ALERT_CONDITION_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.noAlertConditionError',
  { defaultMessage: 'Add an alert condition to the query before continuing' }
);

const SPLIT_FAILED_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.splitFailedError',
  {
    defaultMessage:
      'Review your query or separate the base query and alert condition before continuing',
  }
);

const ALERT_QUERY_ERRORS = {
  no_alert_condition: NO_ALERT_CONDITION_ERROR,
  split_failed: SPLIT_FAILED_ERROR,
  empty: QUERY_REQUIRED_ERROR,
  before_apply: QUERY_REQUIRED_ERROR,
} as const;

/**
 * RHF `rules.validate` for the committed query field.
 * Returns `true` when valid, otherwise an i18n error message.
 */
export const validateCommittedQuery = (
  query: RuleQuery,
  kind: RuleKind,
  queryCommitted: boolean
): true | string => {
  if (!queryCommitted) {
    return QUERY_REQUIRED_ERROR;
  }
  if (kind === 'alert') {
    const summaryState = getEsqlSummaryState(queryCommitted, query);
    if (summaryState === 'success') {
      return true;
    }
    return ALERT_QUERY_ERRORS[summaryState];
  }
  return getBreachQuery(query).trim().length > 0 ? true : QUERY_REQUIRED_ERROR;
};

/** Shared boolean gate for footer submit / step helpers. */
export const isCommittedQueryValid = (
  query: RuleQuery,
  kind: RuleKind,
  queryCommitted: boolean
): boolean => validateCommittedQuery(query, kind, queryCommitted) === true;
