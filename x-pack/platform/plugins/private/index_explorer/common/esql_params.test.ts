/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findEsqlParamNames, inlineEsqlParams } from './esql_params';

describe('findEsqlParamNames', () => {
  it('finds distinct named parameters in order of appearance', () => {
    expect(
      findEsqlParamNames('FROM logs | WHERE host == ?host AND level == ?level OR host == ?host')
    ).toEqual(['host', 'level']);
  });

  it('ignores placeholders inside strings and comments', () => {
    const query = [
      'FROM logs // where ?commented',
      '/* ?blocked */',
      '| WHERE message == "is ?quoted" AND raw == """?triple"""',
      '| WHERE escaped == "a \\" ?still_quoted" AND x == ?real',
    ].join('\n');
    expect(findEsqlParamNames(query)).toEqual(['real']);
  });

  it('treats ??name identifier parameters as parameters', () => {
    expect(findEsqlParamNames('FROM logs | STATS COUNT(*) BY ??field')).toEqual(['field']);
  });

  it('ignores positional parameters', () => {
    expect(findEsqlParamNames('FROM logs | WHERE a == ? AND b == ?1')).toEqual([]);
  });
});

describe('inlineEsqlParams', () => {
  it('replaces value and identifier parameters with literals', () => {
    expect(
      inlineEsqlParams(
        'FROM logs | WHERE host == ?host AND n > ?n AND ok == ?ok | STATS COUNT(*) BY ??field',
        [
          { name: 'host', type: 'string', value: 'a "b"\\c' },
          { name: 'n', type: 'number', value: '5' },
          { name: 'ok', type: 'boolean', value: 'true' },
          { name: 'field', type: 'string', value: 'event.action' },
        ]
      )
    ).toBe(
      'FROM logs | WHERE host == "a \\"b\\"\\\\c" AND n > 5 AND ok == true | STATS COUNT(*) BY `event.action`'
    );
  });

  it('quotes invalid numbers and leaves unknown parameters and strings alone', () => {
    expect(
      inlineEsqlParams('FROM logs | WHERE n == ?n AND x == ?x AND m == "?n"', [
        { name: 'n', type: 'number', value: 'abc' },
      ])
    ).toBe('FROM logs | WHERE n == "abc" AND x == ?x AND m == "?n"');
  });
});
