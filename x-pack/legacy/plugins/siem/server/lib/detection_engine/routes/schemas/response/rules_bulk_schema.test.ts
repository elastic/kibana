/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from './exact_check';
import { foldLeftRight, getBaseResponsePayload, getErrorPayload } from './__mocks__/utils';
import { getPaths } from './utils';
import { RulesBulkSchema, rulesBulkSchema } from './rules_bulk_schema';

describe('prepackaged_rule_schema', () => {
  test('it should validate a regular message and and error together with a uuid', () => {
    const payload: RulesBulkSchema = [getBaseResponsePayload(), getErrorPayload()];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getBaseResponsePayload(), getErrorPayload()]);
  });

  test('it should validate a regular message and and error together when the error has a non UUID', () => {
    const payload: RulesBulkSchema = [getBaseResponsePayload(), getErrorPayload('fake id')];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getBaseResponsePayload(), getErrorPayload('fake id')]);
  });
});
