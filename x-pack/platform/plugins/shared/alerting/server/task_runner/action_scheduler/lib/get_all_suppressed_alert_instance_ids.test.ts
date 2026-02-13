/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllSnoozedAlertInstanceIds } from './get_all_suppressed_alert_instance_ids';

describe('getAllSnoozedAlertInstanceIds', () => {
  it('returns legacy mutedInstanceIds when snoozedAlerts is undefined', () => {
    const result = getAllSnoozedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
    });
    expect(result).toEqual(['a', 'b']);
  });

  it('returns legacy mutedInstanceIds when snoozedAlerts is empty', () => {
    const result = getAllSnoozedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
      snoozedAlerts: [],
    });
    expect(result).toEqual(['a', 'b']);
  });

  it('returns empty array when neither source has data', () => {
    const result = getAllSnoozedAlertInstanceIds({});
    expect(result).toEqual([]);
  });

  it('combines legacy and snoozedAlerts entries', () => {
    const result = getAllSnoozedAlertInstanceIds({
      mutedInstanceIds: ['a'],
      snoozedAlerts: [
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
    const result = getAllSnoozedAlertInstanceIds({
      mutedInstanceIds: ['a', 'b'],
      snoozedAlerts: [
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

  it('returns only snoozedAlerts IDs when legacy is empty', () => {
    const result = getAllSnoozedAlertInstanceIds({
      mutedInstanceIds: [],
      snoozedAlerts: [
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
