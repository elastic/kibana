/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyColumns } from './classify_columns';
import type { ProbedColumn } from '../probe_columns';

const probed = (...columns: Array<[string, string]>): ProbedColumn[] =>
  columns.map(([name, type]) => ({ name, type }));

describe('classifyColumns', () => {
  it('treats last STATS assignments as measures and BY keys as dimensions', () => {
    const result = classifyColumns(
      'FROM logs | STATS count = COUNT(*), bytes = SUM(size) BY host, @timestamp',
      probed(['count', 'long'], ['bytes', 'long'], ['host', 'keyword'], ['@timestamp', 'date'])
    );

    expect(result.measures.map((column) => column.name)).toEqual(['count', 'bytes']);
    expect(result.dimensions.map((column) => column.name)).toEqual(['host', '@timestamp']);
    expect(result.measures[1].sourceFields).toEqual(['size']);
    expect(result.dimensions[0].sourceFields).toEqual(['host']);
  });

  it('uses the function text as the name for unaliased STATS', () => {
    const result = classifyColumns('FROM logs | STATS COUNT(*)', probed(['COUNT(*)', 'long']));

    expect(result.measures.map((column) => column.name)).toEqual(['COUNT(*)']);
  });

  it('follows RENAME after STATS', () => {
    const result = classifyColumns(
      'FROM logs | STATS count = COUNT(*) BY host | RENAME count AS total, host AS hostname',
      probed(['total', 'long'], ['hostname', 'keyword'])
    );

    expect(result.measures.map((column) => column.name)).toEqual(['total']);
    expect(result.dimensions.map((column) => column.name)).toEqual(['hostname']);
    expect(result.measures[0].sourceFields).toEqual([]);
  });

  it('treats a non-numeric EVAL of measures as a dimension', () => {
    const result = classifyColumns(
      'FROM logs | STATS values(port), count() BY port | EVAL tp = concat(to_string(`values(port)`), "/") | RENAME `count()` AS Count, tp AS label',
      probed(['Count', 'long'], ['label', 'keyword'])
    );

    expect(result.measures.map((column) => column.name)).toEqual(['Count']);
    expect(result.dimensions.map((column) => column.name)).toEqual(['label']);
  });

  it('follows EVAL of a measure after STATS', () => {
    const result = classifyColumns(
      'FROM logs | STATS count = COUNT(*) | EVAL extra = count + 1',
      probed(['count', 'long'], ['extra', 'long'])
    );

    expect(result.measures.map((column) => column.name)).toEqual(['count', 'extra']);
    expect(result.measures[1].sourceFields).toEqual(['count']);
  });

  it('falls back to type when the query has no STATS', () => {
    const result = classifyColumns(
      'FROM logs | KEEP host, @timestamp, bytes',
      probed(['host', 'keyword'], ['@timestamp', 'date'], ['bytes', 'long'])
    );

    expect(result.measures.map((column) => column.name)).toEqual(['bytes']);
    expect(result.dimensions.map((column) => column.name)).toEqual(['host', '@timestamp']);
  });
});
