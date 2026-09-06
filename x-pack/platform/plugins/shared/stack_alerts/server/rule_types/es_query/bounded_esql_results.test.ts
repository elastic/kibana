/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import {
  ESQL_RESULTS_MAX_BYTES_PER_EXECUTION,
  ESQL_RESULTS_MAX_ROWS_PER_EXECUTION,
} from '../../../common';
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

  it('includes JSON array delimiters in the serialized-byte budget', () => {
    const emptyRow = { value: '' };
    const rowOverhead = Buffer.byteLength(JSON.stringify(emptyRow), 'utf8');
    const exactLimitRow = {
      value: 'x'.repeat(ESQL_RESULTS_MAX_BYTES_PER_EXECUTION - rowOverhead - 2),
    };
    const result = getBoundedEsqlResults(
      [{ _source: exactLimitRow }, { _source: { value: 'too much' } }],
      createEsqlResultsBudget()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [exactLimitRow],
        totalCount: 2,
        storedCount: 1,
        truncated: true,
      })
    );
    expect(Buffer.byteLength(JSON.stringify(result.results), 'utf8')).toBe(
      ESQL_RESULTS_MAX_BYTES_PER_EXECUTION
    );
    expect(result.remainingBudget.remainingBytes).toBe(0);
  });

  it('shares array delimiter overhead across result groups', () => {
    const emptyRow = { value: '' };
    const rowOverhead = Buffer.byteLength(JSON.stringify(emptyRow), 'utf8');
    const firstRow = {
      value: 'x'.repeat(ESQL_RESULTS_MAX_BYTES_PER_EXECUTION - rowOverhead - 4),
    };
    const firstGroup = getBoundedEsqlResults([{ _source: firstRow }], createEsqlResultsBudget());
    const secondGroup = getBoundedEsqlResults(
      [{ _source: { value: 'too much' } }],
      firstGroup.remainingBudget
    );

    const totalSerializedBytes = [firstGroup, secondGroup].reduce(
      (total, { results }) => total + Buffer.byteLength(JSON.stringify(results), 'utf8'),
      0
    );
    expect(totalSerializedBytes).toBe(ESQL_RESULTS_MAX_BYTES_PER_EXECUTION);
    expect(secondGroup.results).toEqual([]);
    expect(secondGroup.truncated).toBe(true);
  });

  it('includes separators between serialized rows in the byte budget', () => {
    const firstRow = { value: 'first' };
    const secondRow = { value: 'second' };
    const result = getBoundedEsqlResults([{ _source: firstRow }, { _source: secondRow }], {
      remainingRows: 2,
      remainingBytes:
        Buffer.byteLength(JSON.stringify(firstRow), 'utf8') +
        Buffer.byteLength(JSON.stringify(secondRow), 'utf8'),
    });

    expect(result.results).toEqual([firstRow]);
    expect(result.truncated).toBe(true);
  });
});
