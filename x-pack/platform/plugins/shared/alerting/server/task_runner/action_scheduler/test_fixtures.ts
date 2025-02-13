/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  AlertInstanceState,
  AlertInstanceContext,
  ThrottledActions,
} from '@kbn/alerting-state-types';
import { RuleTypeParams, SanitizedRule } from '@kbn/alerting-types';
import { schema } from '@kbn/config-schema';
import { KibanaRequest } from '@kbn/core-http-server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { ActionsClient, PluginStartContract } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { RuleAlertData, RuleTypeState } from '../../../common';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { NormalizedRuleType } from '../../rule_type_registry';
import { TaskRunnerContext } from '../types';
import { AlertingEventLogger } from '../../lib/alerting_event_logger/alerting_event_logger';
import { Alert } from '../../alert';

const apiKey = Buffer.from('123:abc').toString('base64');

type ActiveActionGroup = 'default' | 'other-group';
export const generateAlert = ({
  id,
  group = 'default',
  context,
  state,
  scheduleActions = true,
  throttledActions = {},
  lastScheduledActionsGroup = 'default',
  maintenanceWindowIds,
  pendingRecoveredCount,
  activeCount,
}: {
  id: number;
  group?: ActiveActionGroup | 'recovered';
  context?: AlertInstanceContext;
  state?: AlertInstanceState;
  scheduleActions?: boolean;
  throttledActions?: ThrottledActions;
  lastScheduledActionsGroup?: string;
  maintenanceWindowIds?: string[];
  pendingRecoveredCount?: number;
  activeCount?: number;
}) => {
  const alert = new Alert<AlertInstanceState, AlertInstanceContext, 'default' | 'other-group'>(
    String(id),
    {
      state: state || { test: true },
      meta: {
        maintenanceWindowIds,
        lastScheduledActions: {
          date: new Date().toISOString(),
          group: lastScheduledActionsGroup,
          actions: throttledActions,
        },
        pendingRecoveredCount,
        activeCount,
      },
    }
  );
  if (scheduleActions) {
    alert.scheduleActions(group as ActiveActionGroup);
  }
  if (context) {
    alert.setContext(context);
  }

  return { [id]: alert };
};

export const generateRecoveredAlert = ({
  id,
  state,
}: {
  id: number;
  state?: AlertInstanceState;
}) => {
  const alert = new Alert<AlertInstanceState, AlertInstanceContext, 'recovered'>(String(id), {
    state: state || { test: true },
    meta: {
      lastScheduledActions: {
        date: new Date().toISOString(),
        group: 'recovered',
        actions: {},
      },
    },
  });
  return { [id]: alert };
};

export const getRule = (overrides = {}) =>
  ({
    id: '1',
    name: 'name-of-alert',
    tags: ['tag-A', 'tag-B'],
    mutedInstanceIds: [],
    params: {
      foo: true,
      contextVal: 'My other {{context.value}} goes here',
      stateVal: 'My other {{state.value}} goes here',
    },
    schedule: { interval: '1m' },
    notifyWhen: 'onActiveAlert',
    actions: [
      {
        id: '1',
        group: 'default',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '111-111',
      },
    ],
    consumer: 'test-consumer',
    ...overrides,
  } as unknown as SanitizedRule<RuleTypeParams>);

export const getRuleType = (): NormalizedRuleType<
  RuleTypeParams,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default' | 'other-group',
  'recovered',
  {}
> => ({
  id: 'test',
  name: 'Test',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'recovered', name: 'Recovered' },
    { id: 'other-group', name: 'Other Group' },
  ],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  validate: {
    params: schema.any(),
  },
  alerts: {
    context: 'context',
    mappings: { fieldMap: { field: { type: 'fieldType', required: false } } },
  },
  autoRecoverAlerts: false,
  validLegacyConsumers: [],
});

export const getDefaultSchedulerContext = <
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
>(
  loggerMock: Logger,
  actionsPluginMock: jest.Mocked<PluginStartContract>,
  alertingEventLoggerMock: jest.Mocked<AlertingEventLogger>,
  actionsClientMock: jest.Mocked<PublicMethodsOf<ActionsClient>>,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alertsClientMock: jest.Mocked<any>
) => ({
  rule: getRule(),
  ruleType: getRuleType(),
  logger: loggerMock,
  taskRunnerContext: {
    actionsConfigMap: {
      default: {
        max: 1000,
      },
    },
    actionsPlugin: actionsPluginMock,
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  } as unknown as TaskRunnerContext,
  apiKey,
  ruleConsumer: 'rule-consumer',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  alertUuid: 'uuid-1',
  ruleLabel: 'rule-label',
  request: {} as KibanaRequest,
  alertingEventLogger: alertingEventLoggerMock,
  previousStartedAt: null,
  taskInstance: {
    params: { spaceId: 'test1', alertId: '1' },
  } as unknown as ConcreteTaskInstance,
  actionsClient: actionsClientMock,
  alertsClient: alertsClientMock,
});
