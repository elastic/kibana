/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleCreatePropsToApi } from '.';
import type { AttackDiscoveryScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';

describe('transformAttackDiscoveryScheduleCreatePropsToApi', () => {
  const mockCreateProps: AttackDiscoveryScheduleCreateProps = {
    name: 'Test Schedule',
    enabled: true,
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        name: 'Test AI',
        connectorId: 'test-connector',
        actionTypeId: '.bedrock',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'Other',
      },
      size: 20,
    },
    schedule: {
      interval: '1h',
    },
    actions: [
      {
        id: 'action1',
        actionTypeId: '.slack',
        group: 'default',
        params: {
          message: 'Test message',
        },
        frequency: {
          summary: true,
          notifyWhen: 'onActiveAlert',
          throttle: null,
        },
      },
      {
        actionTypeId: '.cases',
        id: 'system-connector-.cases',
        params: {
          subAction: 'run',
          subActionParams: {
            groupingBy: [],
            reopenClosedCases: false,
            templateId: null,
            timeWindow: '7d',
          },
        },
        uuid: '2c749fe6-9ae0-4518-98c6-02add52a1fa6',
      },
    ],
  };

  it('should transform camelCase fields to snake_case for public API', () => {
    const result = transformAttackDiscoveryScheduleCreatePropsToApi(mockCreateProps);

    expect(result).toEqual({
      name: 'Test Schedule',
      enabled: true,
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          name: 'Test AI',
          connectorId: 'test-connector',
          actionTypeId: '.bedrock',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          provider: 'Other',
        },
        size: 20,
        end: undefined,
        query: undefined,
        filters: undefined,
        combined_filter: undefined,
        start: undefined,
      },
      schedule: {
        interval: '1h',
      },
      actions: [
        {
          id: 'action1',
          action_type_id: '.slack',
          group: 'default',
          params: {
            message: 'Test message',
          },
          uuid: undefined,
          alerts_filter: undefined,
          frequency: {
            summary: true,
            notify_when: 'onActiveAlert',
            throttle: null,
          },
        },
        {
          action_type_id: '.cases',
          id: 'system-connector-.cases',
          params: {
            subAction: 'run',
            subActionParams: {
              groupingBy: [],
              reopenClosedCases: false,
              templateId: null,
              timeWindow: '7d',
            },
          },
          uuid: '2c749fe6-9ae0-4518-98c6-02add52a1fa6',
        },
      ],
    });
  });

  it('should handle undefined actions array', () => {
    const createPropsWithoutActions = {
      ...mockCreateProps,
      actions: undefined,
    };

    const result = transformAttackDiscoveryScheduleCreatePropsToApi(createPropsWithoutActions);

    expect(result.actions).toBeUndefined();
  });

  it('should handle actions without frequency', () => {
    const createPropsWithActionWithoutFrequency = {
      ...mockCreateProps,
      actions: [
        {
          id: 'action1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'Test message',
          },
        },
      ],
    };

    const result = transformAttackDiscoveryScheduleCreatePropsToApi(
      createPropsWithActionWithoutFrequency
    );

    expect(result.actions?.[0]).toEqual({
      action_type_id: '.slack',
      alerts_filter: undefined,
      frequency: undefined,
      group: 'default',
      id: 'action1',
      params: {
        message: 'Test message',
      },
      uuid: undefined,
    });
  });
});
