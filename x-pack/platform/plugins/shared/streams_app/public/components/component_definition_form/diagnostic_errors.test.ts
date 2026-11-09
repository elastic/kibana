/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { toFieldErrors } from './diagnostic_errors';

const error = (message: string, path?: string): StreamsUnit.Diagnostic => ({
  severity: 'error',
  code: 'E028_INVALID_CONFIG_TYPE',
  message,
  path,
});

const config = [
  { name: 'fields', value: [{ action: 'nope' }] },
  { name: 'a/b', value: 'x' },
  { name: 'fields', value: [], telemetry: ['metrics' as const] },
  { name: 'legacy_option', value: true },
];
const fieldNames = new Set(['fields', 'a/b']);

describe('toFieldErrors', () => {
  it('maps config entry pointers to form pointers', () => {
    expect(
      toFieldErrors(
        [
          error('bad action', '/config/0/value/0/action'),
          error('too few', '/config/0'),
          error('escaped', '/config/1/value'),
        ],
        config,
        fieldNames
      )
    ).toEqual({
      errors: { '/fields/0/action': 'bad action', '/fields': 'too few', '/a~1b': 'escaped' },
      unmatched: [],
    });
  });

  it('leaves what has no editable field unmatched', () => {
    const diagnostics = [
      error('no path'),
      error('not a config entry', '/type'),
      error('entry name', '/config/0/name'),
      error('out of range', '/config/9'),
      error('scoped override', '/config/2/value'),
      error('unknown entry', '/config/3'),
      { ...error('a warning', '/config/0'), severity: 'warning' as const },
    ];
    expect(toFieldErrors(diagnostics, config, fieldNames)).toEqual({
      errors: {},
      unmatched: diagnostics,
    });
  });

  it('keeps the first error per field and lists the rest', () => {
    const [first, second] = [error('first', '/config/0'), error('second', '/config/0')];
    expect(toFieldErrors([first, second], config, fieldNames)).toEqual({
      errors: { '/fields': 'first' },
      unmatched: [second],
    });
  });
});
