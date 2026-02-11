/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequestBodyToApplication } from './v1';

describe('transformRequestBodyToApplication', () => {
  it('returns empty object when body is undefined', () => {
    expect(transformRequestBodyToApplication(undefined)).toEqual({});
  });

  it('returns empty object when body is empty', () => {
    expect(transformRequestBodyToApplication({})).toEqual({});
  });

  it('transforms expires_at to expiresAt', () => {
    const result = transformRequestBodyToApplication({
      expires_at: '2025-06-01T12:00:00.000Z',
    });
    expect(result).toEqual({ expiresAt: '2025-06-01T12:00:00.000Z' });
  });

  it('transforms condition_operator to conditionOperator', () => {
    const result = transformRequestBodyToApplication({
      condition_operator: 'all',
    });
    expect(result).toEqual({ conditionOperator: 'all' });
  });

  it('transforms conditions with snake_case to camelCase', () => {
    const result = transformRequestBodyToApplication({
      conditions: [
        {
          type: 'severity_change',
          field: 'kibana.alert.severity',
          snapshot_value: 'high',
        },
        {
          type: 'severity_equals',
          field: 'kibana.alert.severity',
          value: 'critical',
        },
        {
          type: 'field_change',
          field: 'host.name',
          snapshot_value: 'server-01',
        },
      ],
    });

    expect(result.conditions).toHaveLength(3);
    expect(result.conditions![0]).toEqual({
      type: 'severity_change',
      field: 'kibana.alert.severity',
      snapshotValue: 'high',
    });
    expect(result.conditions![1]).toEqual({
      type: 'severity_equals',
      field: 'kibana.alert.severity',
      value: 'critical',
    });
    expect(result.conditions![2]).toEqual({
      type: 'field_change',
      field: 'host.name',
      snapshotValue: 'server-01',
    });
  });

  it('transforms all fields together', () => {
    const result = transformRequestBodyToApplication({
      expires_at: '2025-06-01T12:00:00.000Z',
      conditions: [
        { type: 'severity_change', field: 'kibana.alert.severity', snapshot_value: 'medium' },
      ],
      condition_operator: 'any',
    });

    expect(result).toEqual({
      expiresAt: '2025-06-01T12:00:00.000Z',
      conditions: [
        { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
      ],
      conditionOperator: 'any',
    });
  });

  it('omits optional condition fields when not provided', () => {
    const result = transformRequestBodyToApplication({
      conditions: [{ type: 'severity_change', field: 'kibana.alert.severity' }],
    });

    expect(result.conditions![0]).toEqual({
      type: 'severity_change',
      field: 'kibana.alert.severity',
    });
    expect(result.conditions![0]).not.toHaveProperty('value');
    expect(result.conditions![0]).not.toHaveProperty('snapshotValue');
  });
});
