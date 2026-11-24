/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { parseDataJson } from '../../../parse_data_json';
import type { AlertData } from '../../types';

/**
 * Parses the stored `data_json` and shapes it for action-policy matching and
 * dispatch: dotted keys are nested (`host.name` → `{ host: { name } }`) so
 * matcher expressions can resolve field paths, and only primitive values are
 * kept because matchers compare scalars.
 *
 * This differs from the storage-faithful {@link parseDataJson}, which keeps the
 * `data` flat so the action handlers can re-write `.rule-events` docs unchanged.
 */
export function parseAlertDataForMatching(json: string): AlertData {
  const result: AlertData = {};

  try {
    for (const [key, value] of Object.entries(parseDataJson(json))) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        set(result, key.split('.'), value);
      }
    }
  } catch {
    // Dotted keys that collide with array semantics (e.g. `a.length`) make
    // `set` throw. Degrade to empty data rather than failing the dispatcher tick.
    return {};
  }

  return result;
}
