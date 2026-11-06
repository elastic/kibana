/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderRegistryContract } from '@kbn/alerting-v2-rule-form';

const mockRegister = jest.fn();

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  RuleBuilderRegistry: jest.fn(() => ({
    register: mockRegister,
    has: jest.fn(() => false),
    get: jest.fn(),
    getCreateOptions: jest.fn(() => []),
  })),
}));

const definition = {
  type: 'logs',
  stepTitle: 'Logs',
  createDefaultState: () => ({}),
  renderStep: () => null,
};

const createRegistry = (): jest.Mocked<RuleBuilderRegistryContract> => ({
  register: jest.fn(),
  has: jest.fn((_type: string) => false),
  get: jest.fn(),
  getCreateOptions: jest.fn(() => []),
});

const loadRegistration = async () => import('./rule_builder_registration');

describe('queueRuleBuilderRegistration', () => {
  beforeEach(() => {
    jest.resetModules();
    mockRegister.mockClear();
  });

  it('rejects a duplicate type before the form package loads', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    queueRuleBuilderRegistration(definition);

    expect(() => queueRuleBuilderRegistration({ ...definition, type: ' logs ' })).toThrow(
      /already registered/
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects the built-in threshold builder before the form package loads', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    expect(() => queueRuleBuilderRegistration({ ...definition, type: ' threshold ' })).toThrow(
      /already registered/
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects an empty type', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    expect(() => queueRuleBuilderRegistration({ ...definition, type: '   ' })).toThrow(/non-empty/);
  });

  it('passes the trimmed type to the registry once the form package loads', async () => {
    const { queueRuleBuilderRegistration, applyRuleBuilderRegistrations } =
      await loadRegistration();

    queueRuleBuilderRegistration({ ...definition, type: '  logs  ' });
    await applyRuleBuilderRegistrations();

    expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ type: 'logs' }));
  });

  it('registers straight into the registry once one is attached', async () => {
    const { queueRuleBuilderRegistration, attachRuleBuilderRegistry } = await loadRegistration();
    const registry = createRegistry();

    attachRuleBuilderRegistry(registry);
    queueRuleBuilderRegistration(definition);

    expect(registry.register).toHaveBeenCalledWith(expect.objectContaining({ type: 'logs' }));
  });

  it('keeps the first attached registry so every caller shares one instance', async () => {
    const { attachRuleBuilderRegistry } = await loadRegistration();
    const first = createRegistry();
    const second = createRegistry();

    expect(attachRuleBuilderRegistry(first)).toBe(first);
    expect(attachRuleBuilderRegistry(second)).toBe(first);
  });
});
