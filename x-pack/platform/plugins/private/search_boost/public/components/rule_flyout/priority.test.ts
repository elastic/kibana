/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePriority } from './priority';

describe('parsePriority', () => {
  it.each([
    ['0', 0],
    ['5', 5],
    ['007', 7],
  ])('reads %p as %p', (value, priority) => {
    expect(parsePriority(value)).toBe(priority);
  });

  it.each(['', '-1', '1.5', '1e3', 'abc', ' 5', '99999999999999999999'])(
    'turns %p into 0',
    (value) => {
      expect(parsePriority(value)).toBe(0);
    }
  );
});
