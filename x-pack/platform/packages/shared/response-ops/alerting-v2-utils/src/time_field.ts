/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';

export interface ResolveTimeFieldParams {
  dateFields: string[];
  currentTimeField?: string;
}

/**
 * Picks the time field for a rule's lookback range filter from the date fields
 * present on the index. Returns `null` when nothing can be resolved so callers
 * can fail/force a selection instead of persisting a non-existent time field
 * (rna-program#613).
 */
export const resolveTimeField = ({
  dateFields,
  currentTimeField,
}: ResolveTimeFieldParams): string | null => {
  const uniqueDateFields = [...new Set(dateFields.filter(Boolean))].sort();

  // An explicit selection — including an explicitly-empty one (`''`, e.g. a
  // value cleared after failing to resolve) — must exist on the index; otherwise
  // return null so the caller forces a new selection instead of silently
  // substituting a default. Only an absent selection (`undefined`) auto-picks.
  if (currentTimeField !== undefined) {
    return currentTimeField && uniqueDateFields.includes(currentTimeField)
      ? currentTimeField
      : null;
  }

  if (uniqueDateFields.includes(DEFAULT_TIME_FIELD)) {
    return DEFAULT_TIME_FIELD;
  }
  return uniqueDateFields[0] ?? null;
};
