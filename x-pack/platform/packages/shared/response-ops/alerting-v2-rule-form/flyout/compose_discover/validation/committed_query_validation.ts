/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../../../form/types';
import { getBreachQuery } from '../../../form/utils/query_helpers';
import {
  getEsqlSummaryState,
  type EsqlSummaryState,
} from '../compose_discover_form/esql_query_summary_section';

export const getAlertConditionSummaryState = (
  query: RuleQuery,
  queryCommitted: boolean
): EsqlSummaryState => getEsqlSummaryState(queryCommitted, query);

export const isAlertConditionNextBlocked = (query: RuleQuery, queryCommitted: boolean): boolean =>
  getEsqlSummaryState(queryCommitted, query) !== 'success';

export const isAlertConditionStepValid = (
  query: RuleQuery,
  kind: RuleKind,
  queryCommitted: boolean
): boolean => {
  if (!queryCommitted) {
    return false;
  }
  if (kind === 'alert') {
    return getEsqlSummaryState(queryCommitted, query) === 'success';
  }
  return getBreachQuery(query).trim().length > 0;
};

export const isQueryValidForSubmit = (
  query: RuleQuery,
  kind: RuleKind,
  queryCommitted: boolean
): boolean => {
  if (!queryCommitted) {
    return false;
  }
  if (kind === 'alert') {
    return getEsqlSummaryState(queryCommitted, query) === 'success';
  }
  return getBreachQuery(query).trim().length > 0;
};
