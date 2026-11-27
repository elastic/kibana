/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import {
  escapeEsqlStringLiteral,
  esqlIdentityValue,
  esqlIsNotNullOrEmpty,
  esqlIsNullOrEmpty,
} from './strings';

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

describe('esqlIdentityValue', () => {
  it('reduces the cast field to its lowest non-empty value', () => {
    expect(esqlIdentityValue('host.id')).toBe(
      'CASE(MV_MIN(TO_STRING(host.id)) == "", MV_FIRST(MV_SLICE(MV_SORT(MV_DEDUPE(TO_STRING(host.id))), 1, 1)), MV_MIN(TO_STRING(host.id)))'
    );
  });

  it('references the raw field when castFields is false', () => {
    expect(esqlIdentityValue('host.id', { castFields: false })).toBe(
      'CASE(MV_MIN(host.id) == "", MV_FIRST(MV_SLICE(MV_SORT(MV_DEDUPE(host.id)), 1, 1)), MV_MIN(host.id))'
    );
  });

  it.each([true, false])('parses as ES|QL (castFields: %s)', (castFields) => {
    const { errors } = Parser.parse(
      `FROM logs | EVAL x = ${esqlIdentityValue('host.id', { castFields })}`
    );
    expect(errors).toEqual([]);
  });
});

describe('esqlIsNotNullOrEmpty', () => {
  it('checks the identity value', () => {
    expect(esqlIsNotNullOrEmpty('host.id')).toBe(`${esqlIdentityValue('host.id')} IS NOT NULL`);
  });

  it('keeps a pushable raw IS NOT NULL in front when castFields is false', () => {
    expect(esqlIsNotNullOrEmpty('host.id', { castFields: false })).toBe(
      `host.id IS NOT NULL AND ${esqlIdentityValue('host.id', { castFields: false })} IS NOT NULL`
    );
  });
});

describe('esqlIsNullOrEmpty', () => {
  it('checks the identity value', () => {
    expect(esqlIsNullOrEmpty('host.id')).toBe(`(${esqlIdentityValue('host.id')} IS NULL)`);
  });
});
