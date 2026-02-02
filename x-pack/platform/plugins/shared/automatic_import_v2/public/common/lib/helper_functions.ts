/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a short 12-character alphanumeric identifier.
 */
export function generateId(): string {
  return uuidv4().replace(/-/g, '').slice(0, 12);
}
