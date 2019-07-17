/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { validateActionTypeConfig } from './validate_action_type_config';

test('should return passed in config when validation not defined', () => {
  const result = validateActionTypeConfig(
    {
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      async executor() {},
    },
    {
      foo: true,
    }
  );
  expect(result).toEqual({ foo: true });
});

test('should validate and apply defaults when actionTypeConfig is valid', () => {
  const result = validateActionTypeConfig(
    {
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      validate: {
        config: schema.object({
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

test('should validate and throw error when actionTypeConfig is invalid', () => {
  expect(() =>
    validateActionTypeConfig(
      {
        id: 'my-action-type',
        name: 'My action type',
        unencryptedAttributes: [],
        validate: {
          config: schema.object({
            obj: schema.object({
              param1: schema.string(),
            }),
          }),
        },
        async executor() {},
      },
      {
        obj: {},
      }
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"The actionTypeConfig is invalid: [obj.param1]: expected value of type [string] but got [undefined]"`
  );
});
