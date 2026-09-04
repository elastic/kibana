/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSignalFilter } from './signal_filter';

describe('validateSignalFilter', () => {
  it.each([
    'tags: query_error',
    'tags: query_error and data.tool: "search"',
    'not data.status: Ok',
    'data.agent.id: (one or two)',
    '*',
  ])('accepts %s', (filter) => {
    expect(validateSignalFilter(filter)).toBeUndefined();
  });

  it.each(['tags: (query_error', '((', 'tags: "unclosed', 'tags:', ': foo', 'tags >< 3'])(
    'rejects %s',
    (filter) => {
      expect(validateSignalFilter(filter)).toMatch(/valid KQL query/);
    }
  );

  it('accepts an empty filter, which KQL reads as match-all', () => {
    expect(validateSignalFilter('')).toBeUndefined();
  });
});
