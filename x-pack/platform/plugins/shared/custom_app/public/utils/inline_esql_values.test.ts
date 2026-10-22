/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { inlineEsqlValues } from './inline_esql_values';

describe('writing the values of the app into a query', () => {
  it('replaces a parameter with its value as a quoted text', () => {
    expect(inlineEsqlValues('FROM logs | WHERE service == ?service', { service: 'checkout' })).toBe(
      'FROM logs | WHERE service == "checkout"'
    );
  });

  it('writes numbers and true and false as they are', () => {
    expect(
      inlineEsqlValues('FROM logs | WHERE bytes > ?min AND ok == ?ok', { min: 10, ok: true })
    ).toBe('FROM logs | WHERE bytes > 10 AND ok == true');
  });

  it('writes a list as the values of IN, and as a list anywhere else', () => {
    expect(
      inlineEsqlValues('FROM logs | WHERE u IN (?users) AND MV_COUNT(?users) > 1', {
        users: ['alice', 'bob'],
      })
    ).toBe('FROM logs | WHERE u IN ("alice", "bob") AND MV_COUNT(["alice", "bob"]) > 1');
  });

  it('writes an empty list as null', () => {
    expect(
      inlineEsqlValues('FROM logs | WHERE ?users IS NULL OR u IN (?users)', { users: [] })
    ).toBe('FROM logs | WHERE null IS NULL OR u IN (null)');
  });

  it('writes a number that a select gave as a text as a number in a limit, and nowhere else', () => {
    expect(inlineEsqlValues('FROM logs | LIMIT ?limit', { limit: '100' })).toBe(
      'FROM logs | LIMIT 100'
    );
    expect(inlineEsqlValues('FROM logs | WHERE a == ?v', { v: '100' })).toBe(
      'FROM logs | WHERE a == "100"'
    );
  });

  it('leaves a parameter that has no value alone, such as the time range', () => {
    expect(
      inlineEsqlValues('FROM logs | WHERE @timestamp >= ?_tstart AND s == ?service', {
        service: 'a',
      })
    ).toBe('FROM logs | WHERE @timestamp >= ?_tstart AND s == "a"');
  });

  it('leaves the name of a field alone, which the app does not offer', () => {
    expect(inlineEsqlValues('FROM logs | KEEP ??field', { field: 'x' })).toBe(
      'FROM logs | KEEP ??field'
    );
  });

  it('does not touch a ?name in a text or in a comment', () => {
    const query = 'FROM logs | WHERE msg == "is ?service ok" // ?service\n| WHERE s == ?service';

    expect(inlineEsqlValues(query, { service: 'a' })).toBe(
      'FROM logs | WHERE msg == "is ?service ok" // ?service\n| WHERE s == "a"'
    );
  });

  it('replaces the same parameter wherever it is', () => {
    expect(inlineEsqlValues('FROM logs | WHERE a == ?v OR b == ?v', { v: 'x' })).toBe(
      'FROM logs | WHERE a == "x" OR b == "x"'
    );
  });

  it('works with text that is not plain, around the parameters and in the values', () => {
    expect(
      inlineEsqlValues('FROM logs | WHERE msg == "café 😀" AND s == ?v', { v: 'ñandú 😀' })
    ).toBe('FROM logs | WHERE msg == "café 😀" AND s == "ñandú 😀"');
  });

  describe('a value that tries to be query', () => {
    it.each([
      ['a quote that ends the text', 'x" OR 1==1 //'],
      ['a backslash before the end of the text', 'x\\'],
      ['a pipe and a command', '" | DROP logs | WHERE x == "'],
      ['another parameter', '?other'],
      ['a line break', 'a\nFROM secrets'],
      ['a control character', 'a\u0000b\u001fc'],
      ['a comment', '/* x */ // y'],
    ])('stays a text, with %s', (_what, hostile) => {
      const inlined = inlineEsqlValues('FROM logs | WHERE s == ?v | LIMIT 5', { v: hostile });

      // It is a query that reads, with what was written in one text, and with nothing else added.
      expect(inlined).toBeDefined();
      expect(inlined!.startsWith('FROM logs | WHERE s == "')).toBe(true);
      expect(inlined!.endsWith('" | LIMIT 5')).toBe(true);
      // Read again, it is the three commands that were written, and not one more.
      expect(Parser.parse(inlined!).root.commands.map(({ name }) => name)).toEqual([
        'from',
        'where',
        'limit',
      ]);
    });

    it('is not read as a parameter that is replaced in turn', () => {
      expect(
        inlineEsqlValues('FROM logs | WHERE a == ?first AND b == ?second', {
          first: '?second',
          second: 'x',
        })
      ).toBe('FROM logs | WHERE a == "?second" AND b == "x"');
    });

    it('stays in the list, for every value of a list', () => {
      expect(inlineEsqlValues('FROM logs | WHERE u IN (?users)', { users: ['a", "b', 'c'] })).toBe(
        'FROM logs | WHERE u IN ("a\\", \\"b", "c")'
      );
    });
  });

  it('gives nothing for a query that cannot be read, which is not safe to change', () => {
    expect(inlineEsqlValues('FROM logs | WHERE (', { v: 'x' })).toBeUndefined();
  });

  it('is the query as it was when there is nothing to replace', () => {
    expect(inlineEsqlValues('FROM logs | LIMIT 5', {})).toBe('FROM logs | LIMIT 5');
  });
});
