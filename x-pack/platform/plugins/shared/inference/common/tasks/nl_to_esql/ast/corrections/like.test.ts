/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, BasicPrettyPrinter } from '@kbn/esql-ast';
import { correctLikeWildcards } from './like';

describe('correctLikeWildcards', () => {
  it('replaces badly used "_" wildcard', () => {
    const query = 'FROM logs | WHERE message LIKE "ba_"';
    const { root } = parse(query);
    correctLikeWildcards(root);

    const output = BasicPrettyPrinter.print(root);
    expect(output).toEqual('FROM logs | WHERE message LIKE "ba?"');
  });

  it('replaces badly used "%" wildcard', () => {
    const query = 'FROM logs | WHERE message LIKE "b%"';
    const { root } = parse(query);
    correctLikeWildcards(root);

    const output = BasicPrettyPrinter.print(root);
    expect(output).toEqual('FROM logs | WHERE message LIKE "b*"');
  });

  it('replaces multiple bad wildcards', () => {
    const query = 'FROM logs | WHERE message LIKE "a__t%"';
    const { root } = parse(query);
    correctLikeWildcards(root);

    const output = BasicPrettyPrinter.print(root);
    expect(output).toEqual('FROM logs | WHERE message LIKE "a??t*"');
  });

  it('replaces bad wildcards in multiple commands and functions', () => {
    const query =
      'FROM logs | WHERE message LIKE "a%" AND TO_UPPER(level) LIKE "err%" | WHERE foo LIKE "ba_"';
    const { root } = parse(query);
    correctLikeWildcards(root);

    const output = BasicPrettyPrinter.print(root);
    expect(output).toEqual(
      'FROM logs | WHERE message LIKE "a*" AND TO_UPPER(level) LIKE "err*" | WHERE foo LIKE "ba?"'
    );
  });

  it('does not replace escaped characters', () => {
    const query = 'FROM logs | WHERE message LIKE "ba\\\\_"';
    const { root } = parse(query);
    correctLikeWildcards(root);

    const output = BasicPrettyPrinter.print(root);
    expect(output).toEqual('FROM logs | WHERE message LIKE "ba\\\\_"');
  });
});
