/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesSchema, CreateRulesSchema } from './create_rules_schema_output';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { right } from 'fp-ts/lib/Either';

describe('output create_rules_schema', () => {
  test('it should validate common output message', () => {
    const outputRule: CreateRulesSchema = {
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'elastic',
    };
    const either = createRulesSchema.decode({
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'elastic',
    });
    const value = right(either);
    expect(value).toEqual({});
    expect(PathReporter.report(either)).toEqual(['No errors!']);
  });
});
