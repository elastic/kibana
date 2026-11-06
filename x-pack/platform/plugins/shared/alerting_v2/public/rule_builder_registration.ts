/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleBuilderDefinition,
  RuleBuilderRegistryContract,
} from '@kbn/alerting-v2-rule-form';

const queued: RuleBuilderDefinition[] = [];
const registeredTypes = new Set<string>(['threshold']);
let registry: RuleBuilderRegistryContract | undefined;
let applying: Promise<RuleBuilderRegistryContract> | undefined;

const normalizeRuleBuilder = (definition: RuleBuilderDefinition): RuleBuilderDefinition => {
  const type = definition.type.trim();
  if (!type) {
    throw new Error('Rule builder type must be a non-empty string');
  }
  if (registeredTypes.has(type)) {
    throw new Error(`Rule builder "${type}" is already registered`);
  }
  return type === definition.type ? definition : { ...definition, type };
};

export const queueRuleBuilderRegistration = (definition: RuleBuilderDefinition): void => {
  const normalized = normalizeRuleBuilder(definition);
  registeredTypes.add(normalized.type);
  if (registry) {
    registry.register(normalized);
    return;
  }
  queued.push(normalized);
};

export const attachRuleBuilderRegistry = (
  next: RuleBuilderRegistryContract
): RuleBuilderRegistryContract => {
  if (registry) {
    return registry;
  }
  while (queued.length > 0) {
    const definition = queued.shift();
    if (definition) {
      next.register(definition);
    }
  }
  registry = next;
  return next;
};

export const applyRuleBuilderRegistrations = (): Promise<RuleBuilderRegistryContract> => {
  if (!applying) {
    applying = import('./rule_builder_registry').then(
      ({ ruleBuilderRegistry }) => ruleBuilderRegistry
    );
  }
  return applying;
};
