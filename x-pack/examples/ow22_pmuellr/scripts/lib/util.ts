/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from './types.ts';

// ensures an object is a valid JSON object, not primitive or array
export function ensureJsonObject(data: unknown): JsonObject {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('not a JsonObject');
  }

  return JSON.parse(JSON.stringify(data)) as JsonObject;
}
