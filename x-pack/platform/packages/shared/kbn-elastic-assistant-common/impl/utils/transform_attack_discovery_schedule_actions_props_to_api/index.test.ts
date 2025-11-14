/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleActionsPropsToApi } from '.';
import type { AttackDiscoveryScheduleAction } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';

describe('transformAttackDiscoveryScheduleActionsPropsToApi', () => {
  const mockActions: AttackDiscoveryScheduleAction[] = [
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
  ];

  it('should correctly transform schedule actions to API actions', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsToApi(mockActions);
    expect(result).toEqual([
      {
        action_type_id: '.slack',
        group: 'default',
        id: 'action1',
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
    ]);
  });

  it('should return undefined if no actions are provided', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsToApi(undefined);
    expect(result).toBeUndefined();
  });

  it('should return an empty array if an empty array is provided', () => {
    const result = transformAttackDiscoveryScheduleActionsPropsToApi([]);
    expect(result).toEqual([]);
  });
});
