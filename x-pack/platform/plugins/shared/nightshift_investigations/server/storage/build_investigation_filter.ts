/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import type { FindInvestigationsQuery, InvestigationAttributes } from './types';

/** Translates a query into the KQL filter both saved object repositories search with. */
export const buildInvestigationFilter = <Fields extends keyof InvestigationAttributes>(
  query: FindInvestigationsQuery<Fields>
): string | undefined => {
  const filters: string[] = [];
  const attr = (field: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${field}`;

  if (query.statuses?.length) {
    const statusFilter = query.statuses
      .map((status) => `${attr('status')}: "${escapeQuotes(status)}"`)
      .join(' OR ');
    filters.push(`(${statusFilter})`);
  }

  if (query.concurrencyKey) {
    filters.push(`${attr('concurrency_key')}: "${escapeQuotes(query.concurrencyKey)}"`);
  }

  const rangeFilters: Array<[string, string | undefined, '>=' | '<=']> = [
    ['created_at', query.createdAfter, '>='],
    ['created_at', query.createdBefore, '<='],
    ['started_at', query.startedAfter, '>='],
    ['started_at', query.startedBefore, '<='],
    ['completed_at', query.completedAfter, '>='],
    ['completed_at', query.completedBefore, '<='],
  ];

  for (const [field, value, op] of rangeFilters) {
    if (value) {
      filters.push(`${attr(field)} ${op} "${escapeQuotes(value)}"`);
    }
  }

  return filters.length > 0 ? filters.join(' AND ') : undefined;
};
