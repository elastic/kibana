/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { asEsqlRows, asTypedEsqlQuery, rowsFromEsql } from './typed_esql_query';

interface SampleRow {
  id: string;
  count: number;
}

describe('typed esql query helpers', () => {
  const query = asTypedEsqlQuery<SampleRow>(esql.from('test-index').keep('id', 'count'));

  it('rowsFromEsql maps tabular columns/values using the branded row type', () => {
    const rows = rowsFromEsql(query, {
      columns: [{ name: 'id' }, { name: 'count' }],
      values: [
        ['a', 1],
        ['b', 2],
      ],
    });

    expect(rows).toEqual([
      { id: 'a', count: 1 },
      { id: 'b', count: 2 },
    ]);
  });

  it('asEsqlRows preserves object rows under the branded row type', () => {
    const rows = asEsqlRows(query, [{ id: 'a', count: 1 }]);
    expect(rows).toEqual([{ id: 'a', count: 1 }]);
  });
});
