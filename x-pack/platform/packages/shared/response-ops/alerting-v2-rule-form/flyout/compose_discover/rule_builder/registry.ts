/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderDefinition } from './types';

export const RULE_BUILDER_REGISTRY: Record<string, RuleBuilderDefinition> = {};

/**
 * Adds a builder UI to the registry, making it available in the rule creation and edit flows.
 *
 * The `type` must match the builder type registered on the server, which owns validation and
 * ES|QL generation. Registering a UI is optional: rules created through the API for a
 * server-only builder type still work, they just cannot be edited in the builder form.
 */
export const registerRuleBuilder = <TState>(definition: RuleBuilderDefinition<TState>): void => {
  const { type } = definition;
  if (RULE_BUILDER_REGISTRY[type]) {
    throw new Error(`Rule builder "${type}" is already registered`);
  }
  RULE_BUILDER_REGISTRY[type] = definition as RuleBuilderDefinition;
};
