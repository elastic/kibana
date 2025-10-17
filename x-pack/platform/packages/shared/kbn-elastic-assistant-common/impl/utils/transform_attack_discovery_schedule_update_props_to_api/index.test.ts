/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleUpdatePropsToApi } from '.';
import type { AttackDiscoveryScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';

describe('transformAttackDiscoveryScheduleUpdatePropsToApi', () => {
  const mockUpdateProps: AttackDiscoveryScheduleUpdateProps = {
    name: 'Updated Test Schedule',
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        name: 'Updated Test AI',
        connectorId: 'updated-test-connector',
        actionTypeId: '.bedrock',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'Other',
      },
      size: 25,
      start: 'now-1d',
      end: 'now',
    },
    schedule: {
      interval: '2h',
    },
    actions: [
      {
        id: 'action1',
        actionTypeId: '.slack',
        group: 'default',
        params: {
          message: 'Updated test message',
        },
        frequency: {
          summary: true,
          notifyWhen: 'onActiveAlert',
          throttle: '1h',
        },
      },
      {
        id: 'action2',
        actionTypeId: '.email',
        group: 'default',
        params: {
          subject: 'Attack Discovery Alert',
        },
      },
    ],
  };

  it('should transform camelCase fields to snake_case for public API', () => {
    const result = transformAttackDiscoveryScheduleUpdatePropsToApi(mockUpdateProps);

    expect(result).toEqual({
      name: 'Updated Test Schedule',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          name: 'Updated Test AI',
          connectorId: 'updated-test-connector',
          actionTypeId: '.bedrock',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          provider: 'Other',
        },
        size: 25,
        start: 'now-1d',
        end: 'now',
        query: undefined,
        filters: undefined,
        combined_filter: undefined,
      },
      schedule: {
        interval: '2h',
      },
      actions: [
        {
          id: 'action1',
          action_type_id: '.slack',
          group: 'default',
          params: {
            message: 'Updated test message',
          },
          uuid: undefined,
          alerts_filter: undefined,
          frequency: {
            summary: true,
            notify_when: 'onActiveAlert',
            throttle: '1h',
          },
        },
        {
          id: 'action2',
          action_type_id: '.email',
          group: 'default',
          params: {
            subject: 'Attack Discovery Alert',
          },
          uuid: undefined,
          alerts_filter: undefined,
          frequency: undefined,
        },
      ],
    });
  });

  it('should handle actions without frequency', () => {
    const updatePropsWithActionWithoutFrequency = {
      ...mockUpdateProps,
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

    const result = transformAttackDiscoveryScheduleUpdatePropsToApi(
      updatePropsWithActionWithoutFrequency
    );

    expect(result.actions[0].frequency).toBeUndefined();
  });

  it('should handle minimal params', () => {
    const minimalUpdateProps: AttackDiscoveryScheduleUpdateProps = {
      name: 'Minimal Schedule',
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          name: 'Minimal AI',
          connectorId: 'minimal-connector',
          actionTypeId: '.bedrock',
          model: 'test-model',
          provider: 'Other',
        },
        size: 10,
      },
      schedule: {
        interval: '1h',
      },
      actions: [],
    };

    const result = transformAttackDiscoveryScheduleUpdatePropsToApi(minimalUpdateProps);

    expect(result).toEqual({
      name: 'Minimal Schedule',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          name: 'Minimal AI',
          connectorId: 'minimal-connector',
          actionTypeId: '.bedrock',
          model: 'test-model',
          provider: 'Other',
        },
        size: 10,
        end: undefined,
        query: undefined,
        filters: undefined,
        combined_filter: undefined,
        start: undefined,
      },
      schedule: {
        interval: '1h',
      },
      actions: [],
    });
  });
});
