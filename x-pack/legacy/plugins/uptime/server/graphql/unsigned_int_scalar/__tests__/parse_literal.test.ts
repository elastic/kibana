/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseLiteral } from '../resolvers';

describe('parseLiteral', () => {
  it('parses string literal of type IntValue', () => {
    const result = parseLiteral({
      kind: 'IntValue',
      value: '1562605032000',
    });
    expect(result).toBe(1562605032000);
  });

  it('parses string literal of type FloatValue', () => {
    const result = parseLiteral({
      kind: 'FloatValue',
      value: '1562605032000.0',
    });
    expect(result).toBe(1562605032000);
  });

  it('parses string literal of type String', () => {
    const result = parseLiteral({
      kind: 'StringValue',
      value: '1562605032000',
    });
    expect(result).toBe(1562605032000);
  });

  it('returns `null` for unsupported types', () => {
    expect(
      parseLiteral({
        kind: 'EnumValue',
        value: 'false',
      })
    ).toBeNull();
  });
});
