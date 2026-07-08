/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import type { AlertEpisodeData } from './types';

/**
 * Parses the `data_json` column produced by `JSON_EXTRACT(_source, "$.data")` in the dispatcher's
 * alert-event ES|QL queries into an episode `data` object. Keeps only string/number/boolean leaf
 * values and un-flattens dotted keys (e.g. `host.name` → `{ host: { name } }`).
 *
 * Both the current episode `data` and the snooze baseline `data` are parsed through this function so
 * that conditional-snooze `field_change` comparisons (`isEqual(current, baseline)`) are consistent.
 */
export function parseDataJson(json: string): AlertEpisodeData {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: AlertEpisodeData = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        set(result, key.split('.'), value);
      }
    }
    return result;
  } catch {
    return {};
  }
}
