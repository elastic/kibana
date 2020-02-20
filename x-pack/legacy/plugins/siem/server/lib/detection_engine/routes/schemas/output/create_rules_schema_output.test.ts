/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { right, fold, left, Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { createRulesSchema, CreateRulesSchema } from './create_rules_schema_output';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

interface Message {
  errors?: t.Errors;
  schema?: CreateRulesSchema;
}

const onLeft = (errors: t.Errors): Message => {
  return { errors };
};

const onRight = (schema: CreateRulesSchema): Message => {
  return { schema };
};

const foldLeftRight = fold(onLeft, onRight);

describe('output create_rules_schema', () => {
  test('it should validate common output message', () => {
    const decoded = createRulesSchema.decode({
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      extra: 'string',
    });

    const message = pipe(decoded, foldLeftRight);
    const expected: CreateRulesSchema = {
      created_at: new Date(ANCHOR_DATE),
      updated_at: new Date(ANCHOR_DATE),
      created_by: 'elastic',
      description: 'some description',
    };

    if (message.errors != null) {
      expect(PathReporter.report(left(message.errors))).toEqual('');
    } else {
      expect(message.schema).toEqual(expected);
    }
  });
});
