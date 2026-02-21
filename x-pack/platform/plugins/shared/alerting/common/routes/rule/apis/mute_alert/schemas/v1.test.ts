/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { muteAlertBodySchema } from './v1';

describe('muteAlertBodySchema', () => {
  test('accepts empty body for simple mute requests', () => {
    expect(muteAlertBodySchema.validate({})).toEqual({});
  });

  test('rejects condition_operator when conditions are not provided', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        condition_operator: 'any',
      })
    ).toThrow('condition_operator');
  });

  test('rejects severity_equals condition when value is missing', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
          },
        ],
      })
    ).toThrow('value');
  });

  test('rejects field_change condition when snapshot_value is missing', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
          },
        ],
      })
    ).toThrow('snapshot_value');
  });

  test('accepts severity_equals with an explicitly empty value', () => {
    expect(
      muteAlertBodySchema.validate({
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: '',
          },
        ],
        condition_operator: 'any',
      })
    ).toEqual({
      conditions: [
        {
          type: 'severity_equals',
          field: 'kibana.alert.severity',
          value: '',
        },
      ],
      condition_operator: 'any',
    });
  });
});
