/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  migrateThrottledActions,
  migrateLastScheduledActions,
  migrateMeta,
  migrateAlertInstances,
  upMigration,
} from './migration';

describe('migrateThrottledActions', () => {
  it('should return undefined if input is not an object', () => {
    const result = migrateThrottledActions(null);
    expect(result).toBeUndefined();
  });

  it('should return the migrated throttledActions object', () => {
    const input = {
      key1: { date: '2023-07-31T12:00:00Z' },
      key2: { date: '2023-07-30T12:00:00Z' },
      key3: 'notAnObject',
    };

    const expectedOutput = {
      key1: { date: '2023-07-31T12:00:00Z' },
      key2: { date: '2023-07-30T12:00:00Z' },
    };

    const result = migrateThrottledActions(input);
    expect(result).toEqual(expectedOutput);
  });
});

describe('migrateLastScheduledActions', () => {
  it('should return undefined if input is not a valid lastScheduledActions object', () => {
    const result = migrateLastScheduledActions({ group: 'group1' }); // Missing 'date' property
    expect(result).toBeUndefined();
  });

  it('should return the migrated lastScheduledActions object', () => {
    const input = {
      group: 'group1',
      subgroup: 'subgroup1',
      date: '2023-07-31T12:00:00Z',
      actions: {
        key1: { date: '2023-07-31T12:00:00Z' },
        key2: { date: '2023-07-30T12:00:00Z' },
      },
    };

    const expectedOutput = {
      group: 'group1',
      subgroup: 'subgroup1',
      date: '2023-07-31T12:00:00Z',
      actions: {
        key1: { date: '2023-07-31T12:00:00Z' },
        key2: { date: '2023-07-30T12:00:00Z' },
      },
    };

    const result = migrateLastScheduledActions(input);
    expect(result).toEqual(expectedOutput);
  });
});

describe('migrateMeta', () => {
  it('should return undefined if input is not an object', () => {
    const result = migrateMeta(null);
    expect(result).toBeUndefined();
  });

  it('should return the migrated meta object', () => {
    const input = {
      lastScheduledActions: {
        group: 'group1',
        date: '2023-07-31T12:00:00Z',
      },
      flappingHistory: [true, false, true],
      flapping: true,
      maintenanceWindowIds: ['id1', 'id2'],
      pendingRecoveredCount: 3,
      uuid: 'abc123',
    };

    const expectedOutput = {
      lastScheduledActions: {
        group: 'group1',
        date: '2023-07-31T12:00:00Z',
      },
      flappingHistory: [true, false, true],
      flapping: true,
      maintenanceWindowIds: ['id1', 'id2'],
      pendingRecoveredCount: 3,
      uuid: 'abc123',
    };

    const result = migrateMeta(input);
    expect(result).toEqual(expectedOutput);
  });
});

describe('migrateAlertInstances', () => {
  it('should return undefined if input is not an object', () => {
    const result = migrateAlertInstances(null);
    expect(result).toBeUndefined();
  });

  it('should return the migrated alertInstances object', () => {
    const input = {
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
          uuid: 'abc123',
        },
        state: { key: 'value' },
      },
      instance2: {
        meta: {
          lastScheduledActions: {
            group: 'group2',
            date: '2023-07-30T12:00:00Z',
          },
        },
      },
      instance3: 'notAnObject',
    };

    const expectedOutput = {
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
          uuid: 'abc123',
        },
        state: { key: 'value' },
      },
      instance2: {
        meta: {
          lastScheduledActions: {
            group: 'group2',
            date: '2023-07-30T12:00:00Z',
          },
        },
      },
    };

    const result = migrateAlertInstances(input);
    expect(result).toEqual(expectedOutput);
  });
});

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
    };

    const result = upMigration(inputState);
    expect(result).toEqual(expectedOutput);
  });
});
