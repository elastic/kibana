/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnySourceCommandFromESQLQuery } from '@kbn/esql-utils';
import type { RuleQuery } from '../../form/types';

/**
 * Returns the ES|QL query used to resolve index date fields for time-field
 * selection, or an empty string when nothing is resolvable yet. `base` is the
 * only block that carries a source command, so it is always the candidate.
 *
 * Any registered ES|QL source command (FROM, TS, PROMQL, ROW, SHOW, …) is
 * eligible; the language registry is the source of truth so new commands do
 * not need a local allowlist.
 */
export function getTimeFieldResolutionQuery(query: RuleQuery, queryCommitted: boolean): string {
  const candidate = query.base;
  return queryCommitted && Boolean(getAnySourceCommandFromESQLQuery(candidate)) ? candidate : '';
}
