/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens } from '../model/adaptive_lens';
import type { ViewPlanDiagnostic } from '../plan/view_plan';

import { fromLensSavedObject, type FromLensSavedObjectOptions } from './lens';
import { firstOfType, parseSavedObjectNdjson, type SavedObjectEnvelope } from './ndjson';

export { firstOfType, parseSavedObjectNdjson, type SavedObjectEnvelope } from './ndjson';

export { fromLensSavedObject } from './lens';
export type { FromLensSavedObjectOptions, FromLensSavedObjectResult } from './lens';

export { fromKibanaDashboardSavedObject } from './dashboard';
export type {
  FromKibanaDashboardSavedObjectOptions,
  FromKibanaDashboardSavedObjectResult,
} from './dashboard';

export interface FromKibanaSavedObjectOptions extends FromLensSavedObjectOptions {
  /**
   * Optional Kibana-style time range applied to every synthesized query.
   * Endpoints accept `'now'`, `'now-7d'`, `'now-24h'`, … or ISO 8601
   * absolute strings. When set, the synthesizer adds a top-level
   * `WHERE <timeField> >= <from> AND <timeField> < <to>` clause and also
   * sizes the time-shift analysis window from the range's "from"
   * duration. Leave unset to query the full index.
   */
  timeRange?: { from: string; to: string };
}

export interface FromKibanaSavedObjectResult {
  lens: AdaptiveLens | undefined;
  diagnostics: ViewPlanDiagnostic[];
}

/**
 * Convenience entry point that accepts either:
 * - a single saved-object envelope (typed shape),
 * - the parsed list of envelopes from an NDJSON export, or
 * - the raw NDJSON string.
 *
 * Returns the first Lens envelope's lowering (single-panel convention).
 * For dashboards or multi-panel exports, use `fromKibanaDashboardSavedObject`
 * or iterate envelopes yourself with `fromLensSavedObject`.
 */
export const fromKibanaSavedObject = (
  input: string | SavedObjectEnvelope | SavedObjectEnvelope[],
  options: FromKibanaSavedObjectOptions = {}
): FromKibanaSavedObjectResult => {
  const envelopes = normalizeInput(input);
  const lensEnvelope = firstOfType<SavedObjectEnvelope>(envelopes, 'lens');
  if (!lensEnvelope) {
    return {
      lens: undefined,
      diagnostics: [
        {
          level: 'error',
          code: 'saved-object.no-lens-envelope',
          message: 'no saved-object envelope of type "lens" was found',
        },
      ],
    };
  }
  return fromLensSavedObject(lensEnvelope, options);
};

const normalizeInput = (
  input: string | SavedObjectEnvelope | SavedObjectEnvelope[]
): SavedObjectEnvelope[] => {
  if (typeof input === 'string') {
    return parseSavedObjectNdjson(input);
  }
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
};
