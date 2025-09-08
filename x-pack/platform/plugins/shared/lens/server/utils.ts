/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import type { Props } from '@kbn/config-schema';
import type { Assign } from 'utility-types';

/**
 * Picks a subset of props from base schema definition
 *
 * TODO: move this to shared package, maybe `@kbn/config-schema`
 */
export function pickFromObjectSchema<T extends Props, K extends keyof T>(
  schema: T,
  keys: K[]
): Assign<{}, Pick<T, K>> {
  // Note: Assign type is required to prevent omitted key pollution on spread

  // lodash.pick types do not infer the object type to enforce keyof T
  return pick<T, K>(schema, keys);
}
