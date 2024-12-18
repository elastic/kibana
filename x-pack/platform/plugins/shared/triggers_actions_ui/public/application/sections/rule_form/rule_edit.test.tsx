/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, Rule, GenericValidationResult } from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import RuleEdit from './rule_edit';
import { useKibana } from '../../../common/lib/kibana';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('@kbn/response-ops-rule-form/src/common/apis/update_rule', () => ({
  updateRule: jest.fn().mockRejectedValue({ body: { message: 'Fail message' } }),
}));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health', () => ({
  fetchAlertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('@kbn/response-ops-rule-form/src/common/apis/fetch_ui_config', () => ({
  fetchUiConfig: jest.fn().mockResolvedValue({
    isUsingSecurity: true,
    minimumScheduleInterval: { value: '1m', enforce: false },
  }),
}));

jest.mock('./rule_errors', () => ({
  getRuleActionErrors: jest.fn().mockImplementation(() => {
    return [];
  }),
  getRuleErrors: jest.fn().mockImplementation(() => ({
    ruleParamsErrors: {},
    ruleBaseErrors: {},
    ruleErrors: {
      name: new Array<string>(),
      'schedule.interval': new Array<string>(),
      ruleTypeId: new Array<string>(),
      actionConnectors: new Array<string>(),
    },
  })),
  isValidRule: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status', () => ({
  fetchUiHealthStatus: jest.fn(() => ({ isRulesAvailable: true })),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings', () => ({
  fetchFlappingSettings: jest.fn().mockResolvedValue({
    lookBackWindow: 20,
    statusChangeThreshold: 20,
  }),
}));

describe('rule_edit', () => {
  let wrapper: ReactWrapper<any>;
  let mockedCoreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockedCoreSetup = coreMock.createSetup();
  });

  async function setup(initialRuleFields = {}) {
    const [
      {
        application: { capabilities },
      },
    ] = await mockedCoreSetup.getStartServices();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        writeFlappingSettingsUI: true,
      },
      rules: {
        show: true,
        save: true,
        delete: true,
        execute: true,
      },
    };

    const { loadRuleTypes } = jest.requireMock('../../lib/rule_api/rule_types');
    const ruleTypes = [
      {
        id: 'my-rule-type',
        name: 'Test',
        actionGroups: [
          {
            id: 'testActionGroup',
            name: 'Test Action Group',
          },
        ],
        defaultActionGroupId: 'testActionGroup',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        producer: ALERTING_FEATURE_ID,
        authorizedConsumers: {
          [ALERTING_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          context: [],
          state: [],
          params: [],
        },
      },
    ];
    const ruleType = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'test',
      documentationUrl: null,
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      ruleParamsExpression: () => <></>,
      requiresAppContext: false,
    };

    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });
    loadRuleTypes.mockResolvedValue(ruleTypes);
    const rule: Rule = {
      id: 'ab5661e0-197e-45ee-b477-302d89193b5e',
      params: {
        aggType: 'average',
        threshold: [1000, 5000],
        index: 'kibana_sample_data_flights',
        timeField: 'timestamp',
        aggField: 'DistanceMiles',
        window: '1s',
        comparator: 'between',
      },
      consumer: 'rules',
      ruleTypeId: 'my-rule-type',
      enabled: false,
      schedule: { interval: '1m' },
      actions: [
        {
          actionTypeId: 'my-action-type',
          group: 'threshold met',
          params: { message: 'Rule [{{ctx.metadata.name}}] has exceeded the threshold' },
          id: '917f5d41-fbc4-4056-a8ad-ac592f7dcee2',
        },
      ],
      tags: [],
      name: 'test rule',
      throttle: null,
      notifyWhen: null,
      apiKeyOwner: null,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: new Date(),
      muteAll: false,
      mutedInstanceIds: [],
      updatedAt: new Date(),
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      revision: 0,
      ...initialRuleFields,
    };
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    ruleTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <RuleEdit
          onClose={() => {}}
          initialRule={rule}
          onSave={() => {
            return new Promise<void>(() => {});
          }}
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders rule edit flyout', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="editRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveEditedRuleButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="showEditedRequestButton"]').exists()).toBeTruthy();
  });

  it('displays a toast message on save for server errors', async () => {
    const { isValidRule } = jest.requireMock('./rule_errors');
    (isValidRule as jest.Mock).mockImplementation(() => {
      return true;
    });
    await setup({ name: undefined });

    await act(async () => {
      wrapper.find('[data-test-subj="saveEditedRuleButton"]').last().simulate('click');
    });
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Fail message',
    });
  });

  it('should pass in the config into `getRuleErrors`', async () => {
    const { getRuleErrors } = jest.requireMock('./rule_errors');
    await setup();
    const lastCall = getRuleErrors.mock.calls[getRuleErrors.mock.calls.length - 1];
    expect(lastCall[2]).toBeDefined();
    expect(lastCall[2]).toEqual({
      isUsingSecurity: true,
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
  });

  it('should render an alert icon next to save button stating the potential change in permissions', async () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers({ legacyFakeTimers: true });
    await setup();

    expect(wrapper.find('[data-test-subj="changeInPrivilegesTip"]').exists()).toBeTruthy();
    await act(async () => {
      wrapper.find('[data-test-subj="changeInPrivilegesTip"]').first().simulate('mouseover');
    });

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').last().text()).toBe(
      'Saving this rule will change its privileges and might change its behavior.'
    );
  });
});
