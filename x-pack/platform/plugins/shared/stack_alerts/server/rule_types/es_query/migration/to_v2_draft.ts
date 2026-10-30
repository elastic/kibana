/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { RuleParamsV2Draft } from '@kbn/alerting-plugin/server';
import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { splitEsqlQuery } from '@kbn/alerting-v2-utils';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';

/** Per-row rules alert per group of `STATS ... BY`; all other ES|QL rules raise a single alert. */
const getGroupingFields = (esql: string): string[] => {
  try {
    return getESQLStatsQueryMeta(esql).groupByFields.map(({ field }) => field);
  } catch {
    // A query that cannot be parsed has no grouping to carry over.
    return [];
  }
};

/**
 * Splits the query into `base` and a `breach` segment the way the rule form does, so the alert
 * condition becomes `query.breach`. The whole query stays the base when no condition is found.
 */
const getQuery = (esql: string): RuleParamsV2Draft['query'] => {
  const { base, alertBlock } = splitEsqlQuery(esql);

  return base && alertBlock ? { base, breach: { segment: alertBlock } } : { base: esql };
};

/**
 * Converts the params of an Elasticsearch query rule that uses ES|QL into the params-dependent
 * part of an alerting v2 rule draft.
 *
 * A classic ES|QL rule alerts on every row its query returns. A v2 rule alerts on the rows of
 * `query.base` followed by `query.breach`, so splitting the query keeps the same alerts. Throws
 * for the other Elasticsearch query rule types (KQL and DSL), which have no ES|QL query to carry
 * over.
 */
export const toV2Draft = (params: EsQueryRuleParams): RuleParamsV2Draft => {
  const { searchType, esqlQuery, timeField, timeWindowSize, timeWindowUnit, groupBy } = params;

  if (searchType !== 'esqlQuery') {
    throw new Error(
      i18n.translate('xpack.stackAlerts.esQuery.migration.unsupportedSearchTypeErrorMessage', {
        defaultMessage:
          'Only Elasticsearch query rules that use ES|QL can be migrated to alerting v2. This rule uses "{searchType}".',
        values: { searchType },
      })
    );
  }

  const { esql } = esqlQuery;
  const groupingFields = groupBy === 'row' ? getGroupingFields(esql) : [];

  return {
    query: getQuery(esql),
    time_field: timeField?.trim() || DEFAULT_TIME_FIELD,
    lookback: `${timeWindowSize}${timeWindowUnit}`,
    ...(groupingFields.length ? { grouping: { fields: groupingFields } } : {}),
  };
};
