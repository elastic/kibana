/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collapseSequentialFields } from './collapse_sequential_fields';
import type { GrokPatternNode } from '../types';

describe('collapseSequentialFields', () => {
  it('collapses sequential fields with the same name into GREEDYDATA', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'error.message', component: 'NOTSPACE', values: ['Error:'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'WORD', values: ['Connection'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'DATA', values: ['refused by host'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual([
      {
        id: 'error.message',
        component: 'GREEDYDATA',
        values: ['Error:', 'Connection', 'refused by host'],
      },
    ]);
  });

  it('preserves fields with different names', () => {
    const nodes: GrokPatternNode[] = [
      { id: '@timestamp', component: 'TIMESTAMP_ISO8601', values: ['2025-01-01T00:00:00Z'] },
      { pattern: '\\s' },
      { id: 'log.level', component: 'LOGLEVEL', values: ['ERROR'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'DATA', values: ['Something went wrong'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual(nodes); // No change - all different field names
  });

  it('collapses trailing repeated fields', () => {
    const nodes: GrokPatternNode[] = [
      { id: '@timestamp', component: 'TIMESTAMP_ISO8601', values: ['2025-01-01T00:00:00Z'] },
      { pattern: '\\s' },
      { id: 'message', component: 'WORD', values: ['Error'] },
      { pattern: '\\s' },
      { id: 'message', component: 'WORD', values: ['occurred'] },
      { pattern: '\\s' },
      { id: 'message', component: 'DATA', values: ['in module'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual([
      { id: '@timestamp', component: 'TIMESTAMP_ISO8601', values: ['2025-01-01T00:00:00Z'] },
      { pattern: '\\s' },
      {
        id: 'message',
        component: 'GREEDYDATA',
        values: ['Error', 'occurred', 'in module'],
      },
    ]);
  });

  it('collapses multiple separate sequences independently', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'field.a', component: 'WORD', values: ['foo'] },
      { pattern: '\\s' },
      { id: 'field.a', component: 'WORD', values: ['bar'] },
      { pattern: '\\s' },
      { id: 'field.b', component: 'NOTSPACE', values: ['baz'] },
      { pattern: '\\s' },
      { id: 'field.c', component: 'DATA', values: ['one'] },
      { pattern: '\\s' },
      { id: 'field.c', component: 'DATA', values: ['two'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual([
      {
        id: 'field.a',
        component: 'GREEDYDATA',
        values: ['foo', 'bar'],
      },
      { pattern: '\\s' },
      { id: 'field.b', component: 'NOTSPACE', values: ['baz'] },
      { pattern: '\\s' },
      {
        id: 'field.c',
        component: 'GREEDYDATA',
        values: ['one', 'two'],
      },
    ]);
  });

  it('handles single fields without collapse', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'field.a', component: 'WORD', values: ['test'] },
      { pattern: '\\s' },
      { id: 'field.b', component: 'DATA', values: ['data'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual(nodes); // No sequences to collapse
  });

  it('handles empty input', () => {
    const nodes: GrokPatternNode[] = [];
    const result = collapseSequentialFields(nodes);
    expect(result).toEqual([]);
  });

  it('handles only literal nodes', () => {
    const nodes: GrokPatternNode[] = [{ pattern: '[' }, { pattern: ']' }, { pattern: '\\s' }];

    const result = collapseSequentialFields(nodes);
    expect(result).toEqual(nodes);
  });

  it('deduplicates values in collapsed fields', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'message', component: 'WORD', values: ['Error', 'Warning'] },
      { pattern: '\\s' },
      { id: 'message', component: 'WORD', values: ['Error', 'Info'] },
      { pattern: '\\s' },
      { id: 'message', component: 'DATA', values: ['occurred', 'Warning'] },
    ];

    const result = collapseSequentialFields(nodes);

    // Values should be unique
    expect(result[0]).toEqual({
      id: 'message',
      component: 'GREEDYDATA',
      values: expect.arrayContaining(['Error', 'Warning', 'Info', 'occurred']),
    });
    expect((result[0] as any).values).toHaveLength(4); // No duplicates
  });

  it('collapses fields separated by multiple literal nodes', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'message', component: 'NOTSPACE', values: ['Error:'] },
      { pattern: '\\s' },
      { pattern: '-' },
      { pattern: '\\s' },
      { id: 'message', component: 'DATA', values: ['Connection failed'] },
    ];

    const result = collapseSequentialFields(nodes);

    expect(result).toEqual([
      {
        id: 'message',
        component: 'GREEDYDATA',
        values: ['Error:', 'Connection failed'],
      },
    ]);
  });

  it('preserves single field at start of sequence', () => {
    const nodes: GrokPatternNode[] = [
      { id: '@timestamp', component: 'TIMESTAMP_ISO8601', values: ['2025-01-01T00:00:00Z'] },
      { pattern: '\\s' },
      { id: 'message', component: 'GREEDYDATA', values: ['test'] },
    ];

    const result = collapseSequentialFields(nodes);
    expect(result).toEqual(nodes); // No collapse needed
  });

  it('collapses from start when sequence contains GREEDYDATA (optimization)', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'message', component: 'NOTSPACE', values: ['Error:'] },
      { pattern: '\\s' },
      { id: 'message', component: 'WORD', values: ['Connection'] },
      { pattern: '\\s' },
      { id: 'message', component: 'DATA', values: ['failed'] },
      { pattern: '\\s' },
      { id: 'message', component: 'GREEDYDATA', values: ['at line 42'] },
    ];

    const result = collapseSequentialFields(nodes);

    // All preceding patterns before GREEDYDATA are redundant
    // Collapse entire sequence to GREEDYDATA from the start
    expect(result).toEqual([
      {
        id: 'message',
        component: 'GREEDYDATA',
        values: ['Error:', 'Connection', 'failed', 'at line 42'],
      },
    ]);
  });

  it('collapses GREEDYDATA at the end of multi-field sequence', () => {
    const nodes: GrokPatternNode[] = [
      { id: 'error.code', component: 'NOTSPACE', values: ['E001'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'NOTSPACE', values: ['Failed'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'WORD', values: ['to'] },
      { pattern: '\\s' },
      { id: 'error.message', component: 'GREEDYDATA', values: ['connect to database'] },
    ];

    const result = collapseSequentialFields(nodes);

    // error.code stays separate, error.message collapses to GREEDYDATA
    expect(result).toEqual([
      { id: 'error.code', component: 'NOTSPACE', values: ['E001'] },
      { pattern: '\\s' },
      {
        id: 'error.message',
        component: 'GREEDYDATA',
        values: ['Failed', 'to', 'connect to database'],
      },
    ]);
  });
});
