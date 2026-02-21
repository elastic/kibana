/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequestBodyToApplication } from './v1';

describe('transformRequestBodyToApplication', () => {
  test('returns an empty object when body is null', () => {
    expect(transformRequestBodyToApplication(null)).toEqual({});
  });

  test('maps snake_case fields to application shape', () => {
    expect(
      transformRequestBodyToApplication({
        expires_at: '2027-01-01T00:00:00.000Z',
        condition_operator: 'all',
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshot_value: 'critical',
          },
        ],
      })
    ).toEqual({
      expiresAt: '2027-01-01T00:00:00.000Z',
      conditionOperator: 'all',
      conditions: [
        {
          type: 'field_change',
          field: 'kibana.alert.severity',
          snapshotValue: 'critical',
        },
      ],
    });
  });

  test('preserves explicitly provided empty string values', () => {
    expect(
      transformRequestBodyToApplication({
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: '',
            snapshot_value: '',
          },
        ],
      })
    ).toEqual({
      conditions: [
        {
          type: 'severity_equals',
          field: 'kibana.alert.severity',
          value: '',
          snapshotValue: '',
        },
      ],
    });
  });
});
