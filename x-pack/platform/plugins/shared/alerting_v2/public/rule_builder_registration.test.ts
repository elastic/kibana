/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  registerRuleBuilder: jest.fn(),
}));

const definition = {
  type: 'logs',
  stepTitle: 'Logs',
  createDefaultState: () => ({}),
  renderStep: () => null,
};

const loadRegistration = async () => import('./rule_builder_registration');

describe('queueRuleBuilderRegistration', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('rejects a duplicate type before the form package loads', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    queueRuleBuilderRegistration(definition);

    expect(() => queueRuleBuilderRegistration({ ...definition, type: ' logs ' })).toThrow(
      /already registered/
    );
    expect(
      jest.requireMock('@kbn/alerting-v2-rule-form').registerRuleBuilder
    ).not.toHaveBeenCalled();
  });

  it('rejects the built-in threshold builder before the form package loads', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    expect(() => queueRuleBuilderRegistration({ ...definition, type: ' threshold ' })).toThrow(
      /already registered/
    );
    expect(
      jest.requireMock('@kbn/alerting-v2-rule-form').registerRuleBuilder
    ).not.toHaveBeenCalled();
  });

  it('rejects an empty type', async () => {
    const { queueRuleBuilderRegistration } = await loadRegistration();

    expect(() => queueRuleBuilderRegistration({ ...definition, type: '   ' })).toThrow(/non-empty/);
  });

  it('passes the trimmed type to the form registry', async () => {
    const { queueRuleBuilderRegistration, applyRuleBuilderRegistrations } =
      await loadRegistration();

    queueRuleBuilderRegistration({ ...definition, type: '  logs  ' });
    await applyRuleBuilderRegistrations();

    expect(jest.requireMock('@kbn/alerting-v2-rule-form').registerRuleBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'logs' })
    );
  });
});
