/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { authTypeSpecs } from '@kbn/connector-specs';
import type { AuthTypeRegistry, NormalizedAuthType } from './auth_type_registry';

export function registerAuthTypes(registry: AuthTypeRegistry) {
  for (const spec of Object.values(authTypeSpecs)) {
    registry.register(spec as NormalizedAuthType);
  }
}
