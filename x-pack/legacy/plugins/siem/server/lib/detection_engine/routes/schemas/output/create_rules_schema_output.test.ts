/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { right, fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { createRulesSchema, CreateRulesSchema } from './create_rules_schema_output';

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
    // failure handler
    const onLeft = (errors: t.Errors): string => `${errors.length} error(s) found`;
    // success handler
    const onRight = (s: CreateRulesSchema) => `No errors: ${s.created_at}`;

    const message = pipe(either, fold(onLeft, onRight));
    expect(message).toEqual('');
    // const value = right(either);
    // expect(value).toEqual({});
    expect(true).toEqual(false);
    // expect(PathReporter.report(either)).toEqual(['No errors!']);
  });
});
