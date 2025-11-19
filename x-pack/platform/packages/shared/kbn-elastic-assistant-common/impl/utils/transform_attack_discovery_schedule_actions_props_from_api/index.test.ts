/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleActionsPropsFromApi } from '.';
import type { AttackDiscoveryApiScheduleAction } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

describe('transformAttackDiscoveryScheduleActionsPropsFromApi', () => {
  const mockApiActions: AttackDiscoveryApiScheduleAction[] = [
    {
      id: 'action1',
      action_type_id: '.slack',
      group: 'default',
      params: {
        message: 'Test message',
      },
      uuid: 'test-uuid',
      alerts_filter: { query: { match_all: {} } },
      frequency: {
        summary: true,
        notify_when: 'onActiveAlert',
        throttle: '5m',
      },
    },
    {
      action_type_id: '.cases',
      id: 'system-connector-.cases',
      params: {
        subAction: 'run',
        subActionParams: {
          timeWindow: '7d',
          reopenClosedCases: false,
          groupingBy: [],
          templateId: null,
        },
      },
      uuid: '2c749fe6-9ae0-4518-98c6-02add52a1fa6',
    },
  ];

  it('should correctly transform API actions to schedule actions', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsFromApi(mockApiActions);
    expect(result).toEqual([
      {
        actionTypeId: '.slack',
        group: 'default',
        id: 'action1',
        params: {
          message: 'Test message',
        },
        uuid: 'test-uuid',
        alertsFilter: { query: { match_all: {} } },
        frequency: {
          summary: true,
          notifyWhen: 'onActiveAlert',
          throttle: '5m',
        },
      },
      {
        actionTypeId: '.cases',
        id: 'system-connector-.cases',
        params: {
          subAction: 'run',
          subActionParams: {
            timeWindow: '7d',
            reopenClosedCases: false,
            groupingBy: [],
            templateId: null,
          },
        },
        uuid: '2c749fe6-9ae0-4518-98c6-02add52a1fa6',
      },
    ]);
  });

  it('should return undefined if no actions are provided', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsFromApi(undefined);
    expect(result).toBeUndefined();
  });

  it('should return an empty array if an empty array is provided', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsFromApi([]);
    expect(result).toEqual([]);
  });
});
