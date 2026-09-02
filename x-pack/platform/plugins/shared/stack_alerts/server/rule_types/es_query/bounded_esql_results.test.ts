/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import { ESQL_RESULTS_MAX_ROWS_PER_EXECUTION } from '../../../common';
import { createEsqlResultsBudget, getBoundedEsqlResults } from './bounded_esql_results';

const createHits = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ _source: { value: `${index}` } }));

describe('getBoundedEsqlResults', () => {
  it('returns rows and metadata when the results fit within the budget', () => {
    const rows = createHits(2);

    expect(getBoundedEsqlResults(rows, createEsqlResultsBudget())).toEqual(
      expect.objectContaining({
        results: rows.map(({ _source }) => _source),
        totalCount: 2,
        storedCount: 2,
        truncated: false,
      })
    );
  });

  it('enforces the row budget across result groups', () => {
    const firstGroup = getBoundedEsqlResults(
      createHits(ESQL_RESULTS_MAX_ROWS_PER_EXECUTION - 1),
      createEsqlResultsBudget()
    );
    const secondGroup = getBoundedEsqlResults(createHits(2), firstGroup.remainingBudget);

    expect(secondGroup).toEqual(
      expect.objectContaining({
        results: [{ value: '0' }],
        totalCount: 2,
        storedCount: 1,
        truncated: true,
      })
    );
    expect(secondGroup.remainingBudget.remainingRows).toBe(0);
  });

  it('stops before a row that exceeds the remaining serialized-byte budget', () => {
    const firstRow = { value: 'first' };
    const secondRow = { value: 'second' };
    const result = getBoundedEsqlResults([{ _source: firstRow }, { _source: secondRow }], {
      remainingRows: 2,
      remainingBytes: Buffer.byteLength(JSON.stringify(firstRow), 'utf8'),
    });

    expect(result).toEqual(
      expect.objectContaining({
        results: [firstRow],
        totalCount: 2,
        storedCount: 1,
        truncated: true,
      })
    );
    expect(result.remainingBudget.remainingBytes).toBe(0);
  });
});
