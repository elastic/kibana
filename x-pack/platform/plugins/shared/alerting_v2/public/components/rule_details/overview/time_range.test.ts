/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveGteLte } from './time_range';

const ABSOLUTE_FROM = '2026-08-01T00:00:00.000Z';
const ABSOLUTE_TO = '2026-08-08T00:00:00.000Z';

describe('resolveGteLte', () => {
  it('resolves absolute ISO bounds', () => {
    expect(resolveGteLte(ABSOLUTE_FROM, ABSOLUTE_TO)).toEqual({
      windowStartMs: Date.parse(ABSOLUTE_FROM),
      windowEndMs: Date.parse(ABSOLUTE_TO),
    });
  });
});
