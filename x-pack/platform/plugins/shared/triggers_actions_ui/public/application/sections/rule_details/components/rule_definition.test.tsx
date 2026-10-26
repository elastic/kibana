/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { RuleDefinition } from './rule_definition';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import type { ActionTypeModel, Rule, RuleTypeModel } from '../../../../types';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as capabilities from '../../../lib/capabilities';

jest.mock('./rule_actions', () => ({
  RuleActions: () => {
    return <></>;
  },
}));

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
  hasManageApiKeysCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/lib/kibana');

jest.mock('@kbn/alerts-ui-shared/src/common/hooks');
const { useGetRuleTypesPermissions } = jest.requireMock('@kbn/alerts-ui-shared/src/common/hooks');

const mockedRuleTypeIndex = new Map(
  Object.entries({
    test_rule_type: {
      enabledInLicense: true,
      id: 'test_rule_type',
      name: 'test rule',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
    '2': {
      enabledInLicense: true,
      id: '2',
      name: 'test rule ok',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
    '3': {
      enabledInLicense: true,
      id: '3',
      name: 'test rule pending',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
  })
);

describe('Rule Definition', () => {
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let ruleTypeRegistry: ReturnType<typeof ruleTypeRegistryMock.create>;
  let ruleTypeR: RuleTypeModel;

  beforeEach(() => {
    actionTypeRegistry = actionTypeRegistryMock.create();
    ruleTypeRegistry = ruleTypeRegistryMock.create();

    ruleTypeRegistry.has.mockImplementation((id) => {
      if (id === 'siem_rule' || id === 'attack-discovery') {
        return false;
      }
      return true;
    });

    ruleTypeR = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
    };

    ruleTypeRegistry.get.mockImplementation((id) => {
      if (id === 'siem_rule' || id === 'attack-discovery') {
        throw new Error('error');
      }
      return ruleTypeR;
    });

    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    useGetRuleTypesPermissions.mockReturnValue({
      ruleTypesState: { data: mockedRuleTypeIndex },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders rule definition ', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleDefinition = screen.getByTestId('ruleSummaryRuleDefinition');
    expect(ruleDefinition).toBeInTheDocument();
  });

  it('show rule type name from "useGetRuleTypesPermissions"', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );

    expect(useGetRuleTypesPermissions).toHaveBeenCalled();
    const ruleType = screen.getByTestId('ruleSummaryRuleType');
    expect(ruleType).toBeInTheDocument();
    expect(ruleType).toHaveTextContent(mockedRuleTypeIndex.get(mockRule().ruleTypeId)?.name || '');
  });

  it('show rule type description "', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleDescription = screen.getByTestId('ruleSummaryRuleDescription');
    expect(ruleDescription).toBeInTheDocument();
    expect(ruleDescription).toHaveTextContent('Rule when testing');
  });

  it('show SIEM rule type description "', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule({ consumer: 'siem', ruleTypeId: 'siem_rule' })}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleDescription = screen.getByTestId('ruleSummaryRuleDescription');
    expect(ruleDescription).toBeInTheDocument();
    expect(ruleDescription).toHaveTextContent('Security detection rule');
  });

  it('show Attack Discovery rule type description "', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule({ consumer: 'siem', ruleTypeId: 'attack-discovery' })}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleDescription = screen.getByTestId('ruleSummaryRuleDescription');
    expect(ruleDescription).toBeInTheDocument();
    expect(ruleDescription).toHaveTextContent('Attack Discovery rule');
  });

  it('show rule conditions only if the rule allows multiple conditions', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleCondition = screen.getByTestId('ruleSummaryRuleConditions');
    expect(ruleCondition).toBeInTheDocument();
    expect(ruleCondition).toHaveTextContent('1 condition');
  });

  it('show rule interval with human readable value', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const ruleInterval = screen.getByTestId('ruleSummaryRuleInterval');
    expect(ruleInterval).toBeInTheDocument();
    expect(ruleInterval).toHaveTextContent('1 sec');
  });

  it('show edit button when user has permissions', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const editButton = screen.getByTestId('ruleDetailsEditButton');
    expect(editButton).toBeInTheDocument();
  });

  it('hide edit button when user DOES NOT have permissions', async () => {
    (capabilities.hasAllPrivilege as jest.Mock).mockReturnValue(false);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockRule()}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    const editButton = screen.queryByTestId('ruleDetailsEditButton');
    expect(editButton).toBeNull();
  });
});

function mockRule(overwrite = {}): Rule {
  return {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: {
      name: 'test rule type name',
      description: 'siem description',
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              aggType: 'count',
            },
          ],
          threshold: [100],
          timeSize: 1,
          timeUnit: 'm',
        },
      ],
    },
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    consumer: 'alerts',
    notifyWhen: 'onActiveAlert',
    revision: 0,
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 1000000,
            timestamp: 1234567,
          },
          {
            success: true,
            duration: 200000,
            timestamp: 1234567,
          },
          {
            success: false,
            duration: 300000,
            timestamp: 1234567,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 500,
          },
        },
      },
    },
    ...overwrite,
  };
}
