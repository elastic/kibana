/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodIssue } from '@kbn/zod';
import { ZodError } from '@kbn/zod';
import { formatZodError } from './format_zod_error';

describe('formatZodError', () => {
  it('formats a zod error with a single issue', () => {
    const issue: ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      received: 'boolean',
      path: ['routingKey'],
      message: 'Expected string, received boolean',
    };
    expect(formatZodError(new ZodError([issue]))).toMatchInlineSnapshot(
      `"Field \\"routingKey\\": Expected string, received boolean"`
    );
  });

  it('formats a zod error with a multiple issues', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'boolean',
        path: ['routingKey'],
        message: 'Expected string, received boolean',
      },
      {
        code: 'unrecognized_keys',
        keys: ['extraKey'],
        path: [],
        message: `Unrecognized key(s) in object: 'extraKey'`,
      },
    ];
    expect(formatZodError(new ZodError(issues))).toMatchInlineSnapshot(`
      "2 errors:
       [1]: Unrecognized key(s) in object: 'extraKey';
       [2]: Field \\"routingKey\\": Expected string, received boolean"
    `);
  });

  it('formats a zod error with greater than max issues', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_enum_value',
        options: ['option1', 'option2'],
        received: 'option3',
        path: ['enumField'],
        message: `Invalid enum value. Expected 'option1' | 'option2', received 'option3'`,
      },
      {
        code: 'invalid_date',
        message: `error parsing timestamp "1963-09-55 90:23:45"`,
        path: [],
      },
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: `String must contain at least 1 character(s)`,
        path: ['shortString'],
      },
      {
        code: 'too_big',
        maximum: 10,
        type: 'string',
        inclusive: true,
        exact: false,
        message: `String must contain at most 10 character(s)`,
        path: ['longString'],
      },
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'boolean',
        path: ['routingKey'],
        message: 'Expected string, received boolean',
      },
      {
        code: 'unrecognized_keys',
        keys: ['extraKey'],
        path: [],
        message: `Unrecognized key(s) in object: 'extraKey'`,
      },
    ];
    expect(formatZodError(new ZodError(issues))).toMatchInlineSnapshot(`
      "6 errors:
       [1]: error parsing timestamp \\"1963-09-55 90:23:45\\";
       [2]: Unrecognized key(s) in object: 'extraKey';
       [3]: Field \\"enumField\\": Invalid enum value. Expected 'option1' | 'option2', received 'option3';
       [4]: Field \\"shortString\\": String must contain at least 1 character(s);
       [5]: Field \\"longString\\": String must contain at most 10 character(s);
       [6]: and 1 more"
    `);
  });

  it('formats a zod error with nested issues', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_union',
        unionErrors: [
          new ZodError([
            {
              code: 'invalid_literal',
              expected: 'subaction1',
              received: 'subaction4',
              path: ['subAction'],
              message: `Invalid literal value, expected 'subaction1'`,
            },
          ]),
          new ZodError([
            {
              code: 'invalid_literal',
              expected: 'subaction2',
              received: 'subaction4',
              path: ['subAction'],
              message: `Invalid literal value, expected 'subaction2'`,
            },
            {
              code: 'invalid_type',
              expected: 'string',
              received: 'undefined',
              path: ['subActionParams', 'message'],
              message: `Required`,
            },
          ]),
        ],
        path: [],
        message: `Invalid input`,
      },
    ];
    expect(formatZodError(new ZodError(issues))).toMatchInlineSnapshot(`
      "2 errors:
       [1]: Field \\"subAction\\": Invalid literal value, expected 'subaction1', Invalid literal value, expected 'subaction2';
       [2]: Field \\"subActionParams.message\\": Required"
    `);
  });

  it('limits the level of nested issue to traverse', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'boolean',
        path: [
          'path1',
          'path2',
          'path3',
          'path4',
          'path5',
          'path6',
          'path7',
          'path8',
          'path9',
          'path10',
          'path11',
          'path12',
          'path13',
          'path14',
          'path15',
          'path16',
          'path17',
          'path18',
          'path19',
          'path20',
          'path21',
          'path22',
        ],
        message: 'Expected string, received boolean',
      },
    ];
    expect(formatZodError(new ZodError(issues))).toMatchInlineSnapshot(
      `"Field \\"path1.path2.path3.path4.path5.path6.path7.path8.path9.path10.path11.path12.path13.path14.path15.path16.path17.path18.path19.path20.path21...\\": Unable to parse ZodError - too many levels deep"`
    );
  });
});
