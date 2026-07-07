/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CreateRuleForm } from './create_rule_form';
import type { RuleFormPlugins } from './types';

jest.mock('./rule_form_state', () => ({
  RuleFormStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./rule_page', () => ({
  RulePage: () => <div data-test-subj="rulePageMock" />,
}));

jest.mock('./rule_flyout', () => ({
  RuleFlyout: () => <div data-test-subj="ruleFlyoutMock" />,
}));

jest.mock('./hooks/use_load_dependencies', () => ({
  useLoadDependencies: jest.fn(),
}));

const mutate = jest.fn();
const mockUseCreateRule = jest.fn(() => ({ mutate, isLoading: false }));

jest.mock('./common/hooks', () => ({
  useCreateRule: (...args: unknown[]) => mockUseCreateRule(...args),
}));

const mockReportRuleCreatedEvent = jest.fn();
jest.mock('./common/telemetry', () => ({
  reportRuleCreatedEvent: (...args: unknown[]) => mockReportRuleCreatedEvent(...args),
}));

const { useLoadDependencies } = jest.requireMock('./hooks/use_load_dependencies');

const addSuccess = jest.fn();
const onSubmit = jest.fn();

const basePlugins = {
  http: {},
  docLinks: {},
  notifications: { toasts: { addSuccess, addDanger: jest.fn() } },
  ruleTypeRegistry: { list: jest.fn(() => []), has: jest.fn(() => true), get: jest.fn() },
  fieldsMetadata: {},
  application: { capabilities: {} },
} as unknown as RuleFormPlugins;

describe('CreateRuleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateRule.mockReturnValue({ mutate, isLoading: false });
    useLoadDependencies.mockReturnValue({
      isInitialLoading: false,
      ruleType: { id: '.es-query', authorizedConsumers: { alerts: { all: true } } },
      ruleTypes: [],
      ruleTypeModel: {},
      uiConfig: {},
      healthCheckError: null,
      connectors: [],
      connectorTypes: [],
      alertFields: [],
      flappingSettings: undefined,
    });
  });

  const renderForm = (plugins: RuleFormPlugins = basePlugins) => {
    render(
      <CreateRuleForm ruleTypeId=".es-query" plugins={plugins} onSubmit={onSubmit} isFlyout />
    );
    return mockUseCreateRule.mock.calls[0][0] as {
      onSuccess: (
        rule: { id: string; name: string },
        variables: { formData: Record<string, unknown> }
      ) => void;
    };
  };

  it('shows a success toast and calls onSubmit when the create call succeeds', () => {
    const { onSuccess } = renderForm();

    onSuccess(
      { id: 'rule-1', name: 'my rule' },
      { formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined } }
    );

    expect(addSuccess).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith('rule-1');
  });

  it('reports the rule_created event when plugins.analytics is provided', () => {
    const reportEvent = jest.fn();
    const { onSuccess } = renderForm({
      ...basePlugins,
      analytics: { reportEvent },
    } as unknown as RuleFormPlugins);

    onSuccess(
      { id: 'rule-1', name: 'my rule' },
      {
        formData: {
          ruleTypeId: 'slo.rules.burnRate',
          params: { sloId: 'slo-1' },
          artifacts: { dashboards: [{ id: 'dash-1' }] },
        },
      }
    );

    expect(mockReportRuleCreatedEvent).toHaveBeenCalledWith(
      { reportEvent },
      expect.objectContaining({
        rule_id: 'rule-1',
        rule_type_id: 'slo.rules.burnRate',
        slo_id: 'slo-1',
        dashboard_ids: ['dash-1'],
      })
    );
  });

  it('does not report the rule_created event when plugins.analytics is not provided', () => {
    const { onSuccess } = renderForm();

    onSuccess(
      { id: 'rule-1', name: 'my rule' },
      { formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined } }
    );

    expect(mockReportRuleCreatedEvent).not.toHaveBeenCalled();
  });
});
