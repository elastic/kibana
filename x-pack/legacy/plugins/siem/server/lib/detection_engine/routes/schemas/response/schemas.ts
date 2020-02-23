/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export const description = t.string;
export const enabled = t.boolean;
export const exclude_export_details = t.boolean;
export const false_positives = t.array(t.string);
export const file_name = t.string;
export const filters = t.array(t.unknown); // Filters are not easily type-able yet
export const from = t.string;
export const immutable = t.boolean;
export const rule_id = t.string;
export const id = t.string;
export const index = t.array(t.string);
export const interval = t.string;
export const query = t.string;
export const language = t.keyof({ kuery: null, lucene: null });
export const objects = t.array(t.type({ rule_id }));
export const output_index = t.string;
export const saved_id = t.string;
export const timeline_id = t.string;
export const timeline_title = t.string;
export const meta = t.object;
// TODO: Make this a custom validator
export const max_signals = t.number;
export const name = t.string;

/**
 * Types the risk score as:
 *   - Natural Number (positive integer and not a float),
 *   - Between the values [0 and 100] inclusive.
 */
export const risk_score = new t.Type<number, number, unknown>(
  'risk_score',
  t.number.is,
  (input, context) => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= 100
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);

export const severity = t.keyof({ low: null, medium: null, high: null, critical: null });
export const status = t.keyof({ open: null, closed: null });
export const job_status = t.keyof({ succeeded: null, failed: null, 'going to run': null });
export const to = t.string;
export const type = t.keyof({ query: null, saved_query: null });
export const queryFilter = t.string;
export const references = t.array(t.string);
// TODO: Custom validator
export const per_page = t.number;
// TODO: Custom validator
export const page = t.number;
export const signal_ids = t.array(t.string);
export const signal_status_query = t.object; // I do not think this can be more strict?
export const sort_field = t.string;
export const sort_order = t.keyof({ asc: null, desc: null });
export const tags = t.array(t.string);
export const fields = t.array(t.string);
export const threat_framework = t.string;
export const threat_tactic_id = t.string;
export const threat_tactic_name = t.string;
export const threat_tactic_reference = t.string;
export const threat_tactic = t.type({
  id: threat_tactic_id,
  name: threat_tactic_name,
  reference: threat_tactic_reference,
});
export const threat_technique_id = t.string;
export const threat_technique_name = t.string;
export const threat_technique_reference = t.string;
export const threat_technique = t.type({
  id: threat_technique_id,
  name: threat_technique_name,
  reference: threat_technique_reference,
});
export const threat_techniques = t.array(threat_technique);
export const threat = t.array(
  t.type({
    framework: threat_framework,
    tactic: threat_tactic,
    technique: threat_techniques,
  })
);

// TODO: Change this back to ISODate or make a custom codec for it so it at least tries to validate an ISO string
export const created_at = t.string;

// TODO: Change this back to ISODate or make a custom codec for it so it at least tries to validate an ISO string
export const updated_at = t.string;
export const updated_by = t.string;
export const created_by = t.string;

// TODO: Custom validator needed here
export const version = t.number;

// TODO: Change this back to ISODate or make a custom codec for it so it at least tries to validate an ISO string
export const last_success_at = t.string;

// TODO: Change this back to ISODate or make a custom codec for it so it at least tries to validate an ISO string
export const last_success_message = t.string;

// TODO: Change this back to ISODate or make a custom codec for it so it at least tries to validate an ISO string
export const status_date = t.string;

/**
 * Types the referencesWithDefaultArray as:
 *   - If null or undefined, then a default array will be set
 */
export const referencesWithDefaultArray = new t.Type<string[], string[], unknown>(
  'referencesWithDefaultArray',
  references.is,
  (input): Either<t.Errors, string[]> => (input == null ? t.success([]) : references.decode(input)),
  t.identity
);
