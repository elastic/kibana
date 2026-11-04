/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { escapeEsqlStringLiteral } from './strings';

const parsedLiteral = (value: string): unknown => {
  const { root, errors } = Parser.parse(`ROW x = "${escapeEsqlStringLiteral(value)}"`);
  expect(errors).toEqual([]);
  let literal: unknown;
  Walker.walk(root, {
    visitLiteral: (node) => {
      if (node.literalType === 'keyword') {
        literal = node.valueUnquoted;
      }
    },
  });
  return literal;
};

describe('escapeEsqlStringLiteral', () => {
  it.each([
    ['a plain value', 'alice@corp.com'],
    ['a double quote', 'say "hi"'],
    ['a backslash', 'CORP\\alice'],
    ['a newline', 'line1\nline2'],
    ['a carriage return', 'a\rb'],
    ['a tab', 'a\tb'],
    ['all of them', '"\\\n\r\t'],
  ])('round-trips %s through the ES|QL parser', (_case, value) => {
    expect(parsedLiteral(value)).toBe(value);
  });
});
