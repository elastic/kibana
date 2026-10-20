/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformGetResponseInternal } from './v1';

describe('transformGetResponseInternal (internal)', () => {
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

  it('should return artifacts if artifacts are specified', () => {
    const result = transformGetResponseInternal({
      ...mockedRule,
      artifacts: {
        dashboards: [
          {
            id: 'dashboard-1',
          },
        ],
      },
    });

    expect(result.artifacts).toEqual({
      dashboards: [
        {
          id: 'dashboard-1',
        },
      ],
    });
  });

  it('should not return any artifacts if no artifacts are specified', () => {
    const result = transformGetResponseInternal(mockedRule);
    expect(result).not.toHaveProperty('artifacts');
  });

  it('should include internal fields like monitoring, mapped_params, and snooze_schedule', () => {
    const result = transformGetResponseInternal({
      ...mockedRule,
      mapped_params: { risk_score: 50 },
      monitoring: {
        run: {
          history: [],
          calculated_metrics: { success_ratio: 1 },
          last_run: { timestamp: '2020-08-20T19:23:38Z', metrics: { duration: 0 } },
        },
      },
      snoozeSchedule: [],
      activeSnoozes: [],
      viewInAppRelativeUrl: '/app/test',
    });

    expect(result).toHaveProperty('mapped_params');
    expect(result).toHaveProperty('monitoring');
    expect(result).toHaveProperty('snooze_schedule');
    expect(result).toHaveProperty('active_snoozes');
    expect(result).toHaveProperty('view_in_app_relative_url');
  });
});
