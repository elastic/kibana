/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import type {
  FindInvestigationsQuery,
  InvestigationAttributes,
  SeverityCountsQuery,
} from './types';

const attr = (field: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${field}`;

const orClause = (field: string, values: readonly string[]): string =>
  `(${values.map((value) => `${attr(field)}: "${escapeQuotes(value)}"`).join(' OR ')})`;

/**
 * Every clause except the severity selection.
 *
 * Split out for the severity-count facet, which must not narrow by the tier the user has
 * selected — otherwise picking "Critical" would zero out the other three tiles.
 */
const buildBaseClauses = (query: SeverityCountsQuery): string[] => {
  const filters: string[] = [];

  if (query.statuses?.length) {
    filters.push(orClause('status', query.statuses));
  }

  if (query.subjectTypes?.length) {
    filters.push(orClause('subjectType', query.subjectTypes));
  }

  if (query.concurrencyKey) {
    filters.push(`${attr('concurrencyKey')}: "${escapeQuotes(query.concurrencyKey)}"`);
  }

  const rangeFilters: Array<[string, string | undefined, '>=' | '<=']> = [
    ['createdAt', query.createdAfter, '>='],
    ['createdAt', query.createdBefore, '<='],
    ['startedAt', query.startedAfter, '>='],
    ['startedAt', query.startedBefore, '<='],
    ['completedAt', query.completedAfter, '>='],
    ['completedAt', query.completedBefore, '<='],
  ];

  for (const [field, value, op] of rangeFilters) {
    if (value) {
      filters.push(`${attr(field)} ${op} "${escapeQuotes(value)}"`);
    }
  }

  return filters;
};

const join = (filters: string[]): string | undefined =>
  filters.length > 0 ? filters.join(' AND ') : undefined;

/**
 * The filter behind the severity-count facet: everything the list is filtered by *except* the
 * severity selection, so the per-tier counts stay stable while a tier is selected.
 */
export const buildBaseInvestigationFilter = (query: SeverityCountsQuery): string | undefined =>
  join(buildBaseClauses(query));

/** Translates a query into the KQL filter both saved object repositories search with. */
export const buildInvestigationFilter = <Fields extends keyof InvestigationAttributes>(
  query: FindInvestigationsQuery<Fields>
): string | undefined => {
  const filters = buildBaseClauses(query);

  if (query.severities?.length) {
    filters.push(orClause('severity', query.severities));
  }

  return join(filters);
};
