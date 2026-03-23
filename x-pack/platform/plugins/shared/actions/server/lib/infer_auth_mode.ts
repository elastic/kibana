/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import type { AuthTypeRegistry } from '../auth_types/auth_type_registry';

interface InferAuthModeParams {
  authTypeRegistry: AuthTypeRegistry;
  secrets?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export function inferAuthMode({
  authTypeRegistry,
  secrets,
  config,
}: InferAuthModeParams): AuthMode | undefined {
  const authTypeId =
    (secrets as { authType?: string })?.authType ?? (config as { authType?: string })?.authType;

  if (!authTypeId) {
    return undefined;
  }

  try {
    const authTypeSpec = authTypeRegistry.get(authTypeId);
    return authTypeSpec.authMode ?? 'shared';
  } catch {
    return undefined;
  }
}
