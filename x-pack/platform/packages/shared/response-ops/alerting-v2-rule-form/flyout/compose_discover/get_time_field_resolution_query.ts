/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleQuery } from '../../form/types';

const FROM_QUERY_PATTERN = /^\s*FROM\s+[a-zA-Z0-9_.*-]/i;

/**
 * Returns the ES|QL query used to resolve index date fields for time-field
 * selection. Alert rules use the composed base; signal rules use the
 * standalone breach query. Empty when the query is not committed, has no FROM,
 * or is an alert query that is not composed (alert + standalone is YAML-only).
 */
export function getTimeFieldResolutionQuery(
  query: RuleQuery,
  isAlert: boolean,
  queryCommitted: boolean
): string {
  let candidate = '';
  if (isAlert && query.format === 'composed') {
    candidate = query.base;
  } else if (!isAlert && query.format === 'standalone') {
    candidate = query.breach.query;
  }
  return FROM_QUERY_PATTERN.test(candidate) && queryCommitted ? candidate : '';
}
