/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Time field assumed when an index's date fields are unknown. Kept as a shared
 * constant so the rule schema default, the agentic (Agent Builder) rule
 * creation path, and the rule form UI all agree on the same fallback.
 */
export const DEFAULT_TIME_FIELD = '@timestamp';

export interface ResolveTimeFieldParams {
  /** Names of the `date` (or `date_nanos`) fields available on the target index. */
  dateFields: string[];
  /** Currently selected/stored time field, if any. */
  currentTimeField?: string;
}

/**
 * Picks the time field to use for a rule's lookback range filter given the date
 * fields actually present on the index.
 *
 * This is the single source of truth shared by the threshold rule builder, the
 * ES|QL query sandbox, and the server-side Agent Builder rule creation flow so
 * they can never disagree (see rna-program#613: defaulting to `@timestamp` on
 * `kibana_sample_data_flights`, which only has `timestamp`, produced an
 * "Unknown @timestamp" error).
 *
 * Resolution order:
 * 1. Keep `currentTimeField` when it exists on the index (respect explicit choices).
 * 2. Prefer `@timestamp` when the index has it.
 * 3. Otherwise use the first date field (sorted for determinism).
 * 4. Fall back to `@timestamp` when no date fields are known.
 */
export const resolveTimeField = ({
  dateFields,
  currentTimeField,
}: ResolveTimeFieldParams): string => {
  const uniqueDateFields = [...new Set(dateFields.filter(Boolean))].sort();

  if (currentTimeField && uniqueDateFields.includes(currentTimeField)) {
    return currentTimeField;
  }
  if (uniqueDateFields.includes(DEFAULT_TIME_FIELD)) {
    return DEFAULT_TIME_FIELD;
  }
  if (uniqueDateFields.length > 0) {
    return uniqueDateFields[0];
  }
  return DEFAULT_TIME_FIELD;
};
