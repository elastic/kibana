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
      risk_score: 55,
      references: ['test 1', 'test 2'],
    });

    const message = pipe(decoded, foldLeftRight);
    /*
    const output = strictExactCheck(message);
    const defaults = addDefaults(message);
    const conditionalChecks = doConditionalChecks(message);
    */
    const expected: CreateRulesSchema = {
      created_at: new Date(ANCHOR_DATE),
      updated_at: new Date(ANCHOR_DATE),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      extra: 'string',
    };

    if (message.errors != null) {
      expect(PathReporter.report(left(message.errors))).toEqual('');
    } else {
      expect(message.schema).toEqual(expected);
    }
  });
});

// a unique brand for positive numbers
interface PositiveBrand {
  readonly Positive: unique symbol; // use `unique symbol` here to ensure uniqueness across modules / packages
}

const Positive = t.brand(
  t.number, // a codec representing the type to be refined
  (n): n is t.Branded<number, PositiveBrand> => n >= 0, // a custom type guard using the build-in helper `Branded`
  'Positive' // the name must match the readonly field in the brand
);

type Positive = t.TypeOf<typeof Positive>;
const PositiveInt = t.intersection([t.Int, Positive]);
type PositiveInt = number & t.Brand<t.IntBrand> & t.Brand<PositiveBrand>;
