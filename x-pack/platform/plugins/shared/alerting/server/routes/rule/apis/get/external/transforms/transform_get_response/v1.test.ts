/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformGetResponse } from './v1';
import type {
  RuleResponseV1,
  RuleParamsV1,
} from '../../../../../../../../common/routes/rule/response';

describe('transformGetResponse (external)', () => {
  const mockedRule = {
    id: '1',
    alertTypeId: '1',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    createdAt: new Date('2020-08-20T19:23:38Z'),
    updatedAt: new Date('2020-08-20T19:23:38Z'),
    actions: [],
    consumer: 'bar',
    name: 'abc',
    tags: ['foo'],
    enabled: true,
    muteAll: false,
    notifyWhen: 'onActionGroupChange' as const,
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    throttle: '30s',
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown' as const,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  it('should return artifacts when defined', () => {
    const expectedResult: RuleResponseV1<RuleParamsV1> = {
      id: '1',
      rule_type_id: '1',
      params: {
        bar: true,
      },
      notify_when: 'onActionGroupChange' as const,
      schedule: { interval: '10s' },
      created_at: new Date('2020-08-20T19:23:38Z').toISOString(),
      updated_at: new Date('2020-08-20T19:23:38Z').toISOString(),
      actions: [],
      consumer: 'bar',
      name: 'abc',
      tags: ['foo'],
      enabled: true,
      mute_all: false,
      created_by: '',
      updated_by: '',
      api_key_owner: '',
      throttle: '30s',
      muted_alert_ids: [],
      execution_status: {
        status: 'unknown' as const,
        last_execution_date: new Date('2020-08-20T19:23:38Z').toISOString(),
      },
      revision: 0,
      artifacts: {
        dashboards: [
          {
            id: 'dashboard-1',
          },
        ],
      },
    };

    const result = transformGetResponse({
      ...mockedRule,
      artifacts: {
        dashboards: [
          {
            id: 'dashboard-1',
          },
        ],
      },
    });
    expect(result).toEqual(expectedResult);
  });

  it('should not include internal fields like monitoring or snooze_schedule', () => {
    const result = transformGetResponse({
      ...mockedRule,
      monitoring: {
        run: {
          history: [],
          calculated_metrics: { success_ratio: 1 },
          last_run: { timestamp: '2020-08-20T19:23:38Z', metrics: { duration: 0 } },
        },
      },
      // @ts-expect-error - not all properties are needed
      snoozeSchedule: [{ duration: 1000 }],
      activeSnoozes: ['abc'],
    });

    expect(result).not.toHaveProperty('monitoring');
    expect(result).not.toHaveProperty('snooze_schedule');
    expect(result).not.toHaveProperty('active_snoozes');
    expect(result).not.toHaveProperty('mapped_params');
    expect(result).not.toHaveProperty('view_in_app_relative_url');
  });
});
