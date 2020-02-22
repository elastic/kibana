/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';

export const type = t.keyof({ query: null, saved_query: null });
export const description = t.string;
export const saved_id = t.string;
export const timeline_id = t.string;
export const timeline_title = t.string;

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
export const created_at = DateFromISOString;
export const updated_at = DateFromISOString;
export const created_by = t.string;
export const references = t.array(t.string);

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
