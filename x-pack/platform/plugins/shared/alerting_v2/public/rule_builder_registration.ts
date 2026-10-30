/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderDefinition } from '@kbn/alerting-v2-rule-form';

const queued: RuleBuilderDefinition[] = [];
const registeredTypes = new Set<string>(['threshold']);
let registerFn: ((definition: RuleBuilderDefinition) => void) | undefined;
let applying: Promise<void> | undefined;

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
  if (registerFn) {
    registerFn(normalized);
    return;
  }
  queued.push(normalized);
};

export const applyRuleBuilderRegistrations = (): Promise<void> => {
  if (!applying) {
    applying = import('@kbn/alerting-v2-rule-form').then(({ registerRuleBuilder }) => {
      registerFn = registerRuleBuilder;
      while (queued.length > 0) {
        const definition = queued.shift();
        if (definition) {
          registerRuleBuilder(definition);
        }
      }
    });
  }
  return applying;
};
