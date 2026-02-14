/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllMutedAlertInstanceIds } from './get_all_muted_alert_instance_ids';

describe('getAllMutedAlertInstanceIds', () => {
  it('returns legacy mutedInstanceIds when mutedAlerts is undefined', () => {
    const result = getAllMutedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
    });
    expect(result).toEqual(['a', 'b']);
  });

  it('returns legacy mutedInstanceIds when mutedAlerts is empty', () => {
    const result = getAllMutedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
      mutedAlerts: [],
    });
    expect(result).toEqual(['a', 'b']);
  });

  it('returns empty array when neither source has data', () => {
    const result = getAllMutedAlertInstanceIds({});
    expect(result).toEqual([]);
  });

  it('combines legacy and mutedAlerts entries', () => {
    const result = getAllMutedAlertInstanceIds({
      mutedInstanceIds: ['a'],
      mutedAlerts: [
        {
          alertInstanceId: 'b',
          mutedAt: '2025-01-01T00:00:00.000Z',
          mutedBy: 'elastic',
          conditionOperator: 'any',
        },
      ],
    });
    expect(result).toEqual(expect.arrayContaining(['a', 'b']));
    expect(result).toHaveLength(2);
  });

  it('de-duplicates IDs present in both sources', () => {
    const result = getAllMutedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
      mutedAlerts: [
        {
          alertInstanceId: 'b',
          mutedAt: '2025-01-01T00:00:00.000Z',
          mutedBy: 'elastic',
          conditionOperator: 'any',
        },
        {
          alertInstanceId: 'c',
          mutedAt: '2025-01-01T00:00:00.000Z',
          mutedBy: 'elastic',
          conditionOperator: 'any',
        },
      ],
    });
    expect(result).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(result).toHaveLength(3);
  });

  it('returns only mutedAlerts IDs when legacy is empty', () => {
    const result = getAllMutedAlertInstanceIds({
      mutedInstanceIds: [],
      mutedAlerts: [
        {
          alertInstanceId: 'x',
          mutedAt: '2025-01-01T00:00:00.000Z',
          mutedBy: 'elastic',
          conditionOperator: 'all',
        },
      ],
    });
    expect(result).toEqual(['x']);
  });
});
