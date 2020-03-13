/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from './exact_check';
import { rulesSchema, RulesSchema } from './rules_schema';
import { foldLeftRight, getBaseResponsePayload, getPaths } from './__mocks__/utils';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

describe('rules_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('it should validate a type of "query" without anything extra', () => {
    const payload = getBaseResponsePayload();

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getBaseResponsePayload();

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate invalid_data for the type', () => {
    const payload: Omit<RulesSchema, 'type'> & { type: string } = getBaseResponsePayload();
    payload.type = 'invalid_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid_data" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" with a saved_id together', () => {
    const payload = getBaseResponsePayload();
    payload.type = 'query';
    payload.saved_id = 'save id 123';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "saved_id"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
    const payload = getBaseResponsePayload();
    payload.type = 'saved_query';
    payload.saved_id = 'save id 123';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getBaseResponsePayload();

    expected.type = 'saved_query';
    expected.saved_id = 'save id 123';

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
    const payload = getBaseResponsePayload();
    payload.type = 'saved_query';
    delete payload.saved_id;

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "saved_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" when it has extra data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    payload.type = 'saved_query';
    payload.saved_id = 'save id 123';
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
    const payload = getBaseResponsePayload();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getBaseResponsePayload();
    expected.timeline_id = 'some timeline id';
    expected.timeline_title = 'some timeline title';

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
    const payload: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_id" if there is NOT a "timeline_title" dependent', () => {
    const payload = getBaseResponsePayload();
    payload.timeline_id = 'some timeline id';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "timeline_title"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_title" if there is NOT a "timeline_id" dependent', () => {
    const payload = getBaseResponsePayload();
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" but there is NOT a "timeline_id"', () => {
    const payload = getBaseResponsePayload();
    payload.saved_id = 'some saved id';
    payload.type = 'saved_query';
    payload.timeline_title = 'some timeline title';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "timeline_title"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_id" but there is NOT a "timeline_title"', () => {
    const payload = getBaseResponsePayload();
    payload.saved_id = 'some saved id';
    payload.type = 'saved_query';
    payload.timeline_id = 'some timeline id';

    const decoded = rulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "timeline_title"',
    ]);
    expect(message.schema).toEqual({});
  });
});
