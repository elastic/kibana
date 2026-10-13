/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidCustomResolutionRuleError } from '../../../errors';
import { parseSingleEsqlExpression } from './expression';

describe('parseSingleEsqlExpression', () => {
  it.each([
    ['TO_LOWER(user.name)', 'TO_LOWER(user.name)'],
    [
      'NOT ENDS_WITH(user.name, "$") AND NOT TO_LOWER(user.name) IN ("administrator", "admin")',
      'NOT ENDS_WITH(user.name, "$") AND NOT (TO_LOWER(user.name) IN ("administrator", "admin"))',
    ],
    ['TO_LOWER(REPLACE(user.name, "@.*", ""))', 'TO_LOWER(REPLACE(user.name, "@.*", ""))'],
    ['TO_UPPER(user.id) RLIKE "S-1-5-21-.*"', 'TO_UPPER(user.id) RLIKE "S-1-5-21-.*"'],
    [
      'CONCAT(TO_LOWER(user.name), "|", CASE(TO_LOWER(user.domain) == "corp", "corp.acme.com", TO_LOWER(user.domain)))',
      'CONCAT(TO_LOWER(user.name), "|", CASE(TO_LOWER(user.domain) == "corp", "corp.acme.com", TO_LOWER(user.domain)))',
    ],
    ['"a\\"b\\\\c"', '"a\\"b\\\\c"'],
  ])('accepts %s', (source, expected) => {
    expect(parseSingleEsqlExpression('match_value', source)).toBe(expected);
  });

  it('keeps the author’s parentheses so precedence cannot change the meaning', () => {
    expect(parseSingleEsqlExpression('match_value', 'a * (b / c)')).toBe('a * (b / c)');
  });

  it('strips comments so they cannot swallow the rest of the composed query', () => {
    expect(parseSingleEsqlExpression('filter', 'user.name IS NOT NULL // trailing')).toBe(
      'user.name IS NOT NULL'
    );
    expect(parseSingleEsqlExpression('filter', 'user.name /* x */ IS NOT NULL')).toBe(
      'user.name IS NOT NULL'
    );
  });

  it.each([
    ['a pipe into another command', 'user.name | LIMIT 1'],
    ['an escape out of the parentheses', 'true) | DROP user.name | WHERE (true'],
    ['a pipe after a line comment', 'user.name // c\n| DROP user.id'],
    ['a sub-query', '(FROM other_index)'],
    ['two expressions', 'user.name, user.id'],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['an assignment', 'x = TO_LOWER(user.name)'],
    ['a map', '{"a": 1}'],
    ['a named parameter', 'TO_LOWER(?name)'],
    ['an unnamed parameter', 'CASE(user.name == ?, "a", "b")'],
    ['a syntax error', 'TO_LOWER(user.name'],
  ])('rejects %s', (_case, source) => {
    expect(() => parseSingleEsqlExpression('filter', source)).toThrow(
      InvalidCustomResolutionRuleError
    );
  });

  it('names the attribute in the error', () => {
    expect(() => parseSingleEsqlExpression('match_value', 'a, b')).toThrow(
      "Invalid 'match_value' in custom resolution rule: must be a single ES|QL expression"
    );
  });

  it('reports the syntax error itself, not the internal EVAL wrapper', () => {
    let message = '';
    try {
      parseSingleEsqlExpression('match_value', 'TO_LOWER(user.name');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ES|QL syntax error:');
    expect(message).toContain("'TO_LOWER(user.name'");
    expect(message).not.toContain('EVAL');
    expect(message).not.toContain('FROM a');
  });

  it('is stable when its output is parsed again', () => {
    const once = parseSingleEsqlExpression(
      'filter',
      'NOT user.name IN ("a")  AND   user.id::keyword == "x"'
    );
    expect(parseSingleEsqlExpression('filter', once)).toBe(once);
  });
});
