/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { validateAlertTypeParams } from './validate_alert_type_params';

test('should return passed in params when validation not defined', () => {
  const result = validateAlertTypeParams(
    {
      id: 'my-alert-type',
      name: 'My description',
      actionGroups: [],
      async executor() {},
    },
    {
      foo: true,
    }
  );
  expect(result).toEqual({ foo: true });
});

test('should validate and apply defaults when params is valid', () => {
  const result = validateAlertTypeParams(
    {
      id: 'my-alert-type',
      name: 'My description',
      actionGroups: [],
      validate: {
        params: schema.object({
          param1: schema.string(),
          param2: schema.string({ defaultValue: 'default-value' }),
        }),
      },
      async executor() {},
    },
    { param1: 'value' }
  );
  expect(result).toEqual({
    param1: 'value',
    param2: 'default-value',
  });
});

test('should validate and throw error when params is invalid', () => {
  expect(() =>
    validateAlertTypeParams(
      {
        id: 'my-alert-type',
        name: 'My description',
        actionGroups: [],
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
        async executor() {},
      },
      {}
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
  );
});
