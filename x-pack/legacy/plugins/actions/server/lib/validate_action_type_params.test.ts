/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { validateActionTypeParams } from './validate_action_type_params';

test('should return passed in params when validation not defined', () => {
  const result = validateActionTypeParams(
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
  expect(result).toEqual({
    foo: true,
  });
});

test('should validate and apply defaults when params is valid', () => {
  const result = validateActionTypeParams(
    {
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: [],
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
            param2: Joi.string().default('default-value'),
          })
          .required(),
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
    validateActionTypeParams(
      {
        id: 'my-action-type',
        name: 'My action type',
        unencryptedAttributes: [],
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async executor() {},
      },
      {}
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"The actionParams is invalid: child \\"param1\\" fails because [\\"param1\\" is required]"`
  );
});
