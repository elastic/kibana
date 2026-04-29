/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateRuleTypeParams } from './validate_rule_type_params';

test('should return passed in params when validation not defined', () => {
  const result = validateRuleTypeParams({
    foo: true,
  });
  expect(result).toEqual({ foo: true });
});

test('should validate and apply defaults when params is valid', () => {
  const result = validateRuleTypeParams(
    { param1: 'value' },
    schema.object({
      param1: schema.string(),
      param2: schema.string({ defaultValue: 'default-value' }),
    })
  );
  expect(result).toEqual({
    param1: 'value',
    param2: 'default-value',
  });
});

test('should validate and throw error when params is invalid', () => {
  expect(() =>
    validateRuleTypeParams(
      {},
      schema.object({
        param1: schema.string(),
      })
    )
  ).toThrowErrorMatchingInlineSnapshot(
    `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
  );
});
