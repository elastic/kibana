/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_BUILDER_TYPES } from '@kbn/alerting-v2-rule-builders';
import type { BuilderTypeRegistry } from './builder_type_registry';

/**
 * Registers the RnA-owned built-in rule builder types (threshold). Other teams
 * register their own via `AlertingServerSetup.registerBuilderType` from their
 * own plugins.
 */
export function registerBuiltinBuilderTypes(registry: BuilderTypeRegistry): void {
  for (const definition of BUILTIN_BUILDER_TYPES) {
    registry.register(definition);
  }
}
