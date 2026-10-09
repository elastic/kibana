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
 * can fail/force a selection instead of persisting a non-existent time field.
 */
export const resolveTimeField = ({
  dateFields,
  currentTimeField,
}: ResolveTimeFieldParams): string | null => {
  const uniqueDateFields = [...new Set(dateFields.filter(Boolean))].sort();

  if (currentTimeField) {
    return uniqueDateFields.includes(currentTimeField) ? currentTimeField : null;
  }

  if (uniqueDateFields.includes(DEFAULT_TIME_FIELD)) {
    return DEFAULT_TIME_FIELD;
  }
  return uniqueDateFields[0] ?? null;
};
