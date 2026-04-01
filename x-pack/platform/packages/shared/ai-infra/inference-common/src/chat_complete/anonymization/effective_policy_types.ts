/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationEntityClass } from './types';

/**
 * The effective policy state for a single field after resolution.
 */
export type EffectiveFieldPolicy =
  | { action: 'deny' }
  | { action: 'allow' }
  | { action: 'anonymize'; entityClass: AnonymizationEntityClass };

/**
 * The effective policy for all fields after resolving one or more profiles.
 * Keyed by field name.
 */
export type EffectivePolicy = Record<string, EffectiveFieldPolicy>;
