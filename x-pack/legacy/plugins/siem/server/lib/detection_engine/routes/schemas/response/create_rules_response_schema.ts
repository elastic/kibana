/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { isObject } from 'lodash/fp';
import { checkTypeDependents } from './check_type_dependents';
import { RulesSchema } from './base_rules_schema';

export const createRulesSchema = new t.Type<RulesSchema, RulesSchema, unknown>(
  'createRulesSchema',
  (input: unknown): input is RulesSchema => isObject(input),
  (input, context): Either<t.Errors, RulesSchema> => {
    if (input == null) {
      return t.failure(input, context, 'Object required');
    } else {
      return checkTypeDependents(input);
    }
  },
  t.identity
);

export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;
