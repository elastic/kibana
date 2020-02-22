/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from './exact_check';
import { createRulesSchema, CreateRulesSchema } from './create_rules_response_schema';
import { foldLeftRight, getPaths } from './__mocks__/utils';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

describe('create_rules_schema_output', () => {
  test('it should validate a type of "query" without anything extra', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: CreateRulesSchema = {
      created_at: new Date(ANCHOR_DATE),
      updated_at: new Date(ANCHOR_DATE),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
    };
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
      invalid_extra_data: 'invalid_extra_data', // invalid extra data
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: invalid_extra_data']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate invalid_data for the type', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      threat: [],
      type: 'invalid_data', // invalid data
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value invalid_data supplied to: type',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" with a saved_id together', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
      saved_id: 'id 123',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: saved_id']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'saved_query',
      threat: [],
      saved_id: 'some id',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: CreateRulesSchema = {
      created_at: new Date(ANCHOR_DATE),
      updated_at: new Date(ANCHOR_DATE),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'saved_query',
      saved_id: 'some id',
      threat: [],
    };

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      threat: [],
      type: 'saved_query',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value undefined supplied to: saved_id',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" when it has extra data', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'saved_query',
      saved_id: 'some id',
      threat: [],
      invalid_extra_data: 'invalid_extra_data', // invalid extra data
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: invalid_extra_data']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "timeline_id" if there is "timeline_title" dependent', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      timeline_id: 'some timeline id',
      timeline_title: 'some timeline title',
      threat: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: CreateRulesSchema = {
      created_at: new Date(ANCHOR_DATE),
      updated_at: new Date(ANCHOR_DATE),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      timeline_id: 'some timeline id',
      timeline_title: 'some timeline title',
      threat: [],
    };

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra data', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      timeline_id: 'some timeline id',
      timeline_title: 'some timeline title',
      threat: [],
      invalid_extra_data: 'invalid_extra_data', // invalid extra data
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: invalid_extra_data']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_id" if there is NOT a "timeline_title" dependent', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
      timeline_id: 'some timeline id',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value undefined supplied to: timeline_title',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "timeline_title" if there is NOT a "timeline_id" dependent', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'query',
      threat: [],
      timeline_title: 'some timeline title',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: timeline_title']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_title" is there but NOT a "timeline_id"', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'saved_query',
      saved_id: 'some id',
      threat: [],
      timeline_title: 'some title',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys found: timeline_title']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" with a "saved_id" dependent and a "timeline_id" is there but NOT a "timeline_title"', () => {
    const payload = {
      created_at: new Date(ANCHOR_DATE).toISOString(),
      updated_at: new Date(ANCHOR_DATE).toISOString(),
      created_by: 'elastic',
      description: 'some description',
      risk_score: 55,
      references: ['test 1', 'test 2'],
      type: 'saved_query',
      saved_id: 'some id',
      threat: [],
      timeline_id: 'some timeline id',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value undefined supplied to: timeline_title',
    ]);
    expect(message.schema).toEqual({});
  });
});
