/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { quoteEsqlIndexName } from './quote_esql_index_name';

describe('quoteEsqlIndexName', () => {
  it('wraps a regular index name in double quotes', () => {
    expect(quoteEsqlIndexName('my-index')).toBe('"my-index"');
  });

  it('keeps names with control characters inside the quotes', () => {
    expect(quoteEsqlIndexName('a4tr\n')).toBe('"a4tr\n"');
  });

  it('escapes double quotes and backslashes', () => {
    expect(quoteEsqlIndexName('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  it('prevents breaking out of the index source', () => {
    expect(quoteEsqlIndexName('x" | DROP y | FROM "z')).toBe('"x\\" | DROP y | FROM \\"z"');
  });
});
