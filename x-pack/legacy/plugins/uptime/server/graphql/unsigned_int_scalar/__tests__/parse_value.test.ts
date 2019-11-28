/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseValue } from '../resolvers';

describe('parseValue', () => {
  it(`parses a number value and returns it if its > 0`, () => {
    const result = parseValue('1562605032000');
    expect(result).toBe(1562605032000);
  });

  it(`parses a number and returns null if its value is < 0`, () => {
    const result = parseValue('-1562605032000');
    expect(result).toBeNull();
  });
});
