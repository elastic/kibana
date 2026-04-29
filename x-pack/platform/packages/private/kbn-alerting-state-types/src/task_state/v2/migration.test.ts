/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upMigration } from './migration';

describe('upMigration', () => {
  it('should return the migrated state object', () => {
    const inputState = {
      alertTypeState: {},
      alertInstances: {
        instance1: {
          meta: {
            lastScheduledActions: {
              group: 'group1',
              date: '2023-07-31T12:00:00Z',
            },
            flappingHistory: [true, false, true],
            flapping: true,
            maintenanceWindowIds: ['id1', 'id2'],
            pendingRecoveredCount: 3,
            activeCount: 1,
            uuid: 'abc123',
          },
          state: { key: 'value' },
        },
      },
      alertRecoveredInstances: {},
      previousStartedAt: '2023-07-30T12:00:00Z',
      summaryActions: {
        action1: { date: '2023-07-31T12:00:00Z' },
      },
      trackedExecutions: ['111-22-33'],
    };

    const expectedOutput = {
      alertTypeState: {},
      alertInstances: {
        instance1: {
          meta: {
            lastScheduledActions: {
              group: 'group1',
              date: '2023-07-31T12:00:00Z',
            },
            flappingHistory: [true, false, true],
            flapping: true,
            maintenanceWindowIds: ['id1', 'id2'],
            pendingRecoveredCount: 3,
            activeCount: 1,
            uuid: 'abc123',
          },
          state: { key: 'value' },
        },
      },
      alertRecoveredInstances: {},
      previousStartedAt: '2023-07-30T12:00:00Z',
      summaryActions: {
        action1: { date: '2023-07-31T12:00:00Z' },
      },
      trackedExecutions: ['111-22-33'],
    };

    const result = upMigration(inputState);
    expect(result).toEqual(expectedOutput);
  });
});
