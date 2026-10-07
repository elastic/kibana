/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUBJECT_SEPARATOR = '::';

export interface SubjectInput {
  source?: string | null;
  rule_id?: string | null;
  space_id?: string | null;
}

/**
 * Returns the series identity subject for an alert.
 *
 * - Internal alerts (`source == 'internal'` or no source): subject = rule_id
 * - External alerts (any other source): subject = `${space_id}::${source}`
 *
 * `rule_id` is a globally unique saved-object id, so it already implies a space.
 * A vendor name is not space-aware and `group_hash` is only a grouping key
 * (see `buildGroupHash`), so the space is folded into the external subject to
 * keep alert identity, throttling and suppression isolated per space.
 *
 * Must stay in sync with `SUBJECT_EVAL` in `../../queries.ts`. Both queries drop
 * rows whose subject is null, so the throws below are unreachable from query data.
 */
export const alertSubject = ({ source, rule_id, space_id }: SubjectInput): string => {
  if (source != null && source !== 'internal') {
    if (space_id == null) {
      throw new Error(
        `alertSubject: external alert has no space_id (source=${JSON.stringify(source)})`
      );
    }
    return `${space_id}${SUBJECT_SEPARATOR}${source}`;
  }
  if (rule_id != null) return rule_id;
  // Invariant violation: an internal alert must have a rule_id.
  throw new Error(
    `alertSubject: alert has neither a valid source nor a rule_id (source=${JSON.stringify(
      source
    )})`
  );
};
