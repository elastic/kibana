/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StabilityLevel } from '@kbn/workflows';

export interface StabilitySource {
  readonly stability?: StabilityLevel;
}

/**
 * Stability level for extension-registered steps and triggers (hover badge + suggest parity for tech preview).
 */
export function getExtensionStability(definition: StabilitySource): StabilityLevel | undefined {
  if (definition.stability === 'beta' || definition.stability === 'tech_preview') {
    return definition.stability;
  }
  if (definition.stability === 'stable') {
    return undefined;
  }
  // Unmarked extension definitions are experimental until explicitly marked stable.
  return 'tech_preview';
}
