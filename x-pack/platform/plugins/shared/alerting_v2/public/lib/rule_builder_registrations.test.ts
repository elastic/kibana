/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderDefinition } from '@kbn/alerting-v2-rule-form';

const mockRegisterRuleBuilder = jest.fn();

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  registerRuleBuilder: (definition: unknown) => mockRegisterRuleBuilder(definition),
}));

const loadModule = async () => {
  jest.resetModules();
  return import('./rule_builder_registrations');
};

const definition = (type: string) =>
  ({
    type,
    createOption: { title: type, description: type, iconType: 'gear' },
    stepTitle: type,
    createDefaultState: () => ({}),
    renderStep: () => null,
  } as RuleBuilderDefinition);

describe('rule builder registrations', () => {
  beforeEach(() => {
    mockRegisterRuleBuilder.mockClear();
  });

  it('does not load the rule form when nothing was contributed', async () => {
    const { applyRuleBuilderRegistrations } = await loadModule();

    await applyRuleBuilderRegistrations();

    expect(mockRegisterRuleBuilder).not.toHaveBeenCalled();
  });

  it('hands queued builders to the rule form registry', async () => {
    const { applyRuleBuilderRegistrations, queueRuleBuilderRegistration } = await loadModule();
    const first = definition('first');
    const second = definition('second');

    queueRuleBuilderRegistration(first);
    queueRuleBuilderRegistration(second);
    await applyRuleBuilderRegistrations();

    expect(mockRegisterRuleBuilder.mock.calls).toEqual([[first], [second]]);
  });

  it('registers each builder once across repeated applies', async () => {
    const { applyRuleBuilderRegistrations, queueRuleBuilderRegistration } = await loadModule();

    queueRuleBuilderRegistration(definition('first'));
    await applyRuleBuilderRegistrations();
    await applyRuleBuilderRegistrations();

    expect(mockRegisterRuleBuilder).toHaveBeenCalledTimes(1);
  });
});
