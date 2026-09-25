/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { buildExampleQueries, EXCLUDE_MEMORY_KI_TYPES_FILTER } from './example_queries';

describe('buildExampleQueries', () => {
  const queries = buildExampleQueries('ai-index-idx-support*');
  const queriesExcludingMemory = buildExampleQueries('ai-index-idx-support*', {
    excludeMemory: true,
  });

  it('returns the three fixed shapes, targeting the given index', () => {
    expect(queries.map(({ title }) => title)).toEqual([
      'Full text search, lexical and semantic fused together (?query)',
      'Filter by knowledge item type and tag (?type, ?tag; tags is multi-valued, so MATCH)',
      'Count by type',
    ]);
    for (const { esql } of queries) {
      expect(esql.startsWith('FROM ai-index-idx-support*')).toBe(true);
    }
  });

  it('parses as valid ES|QL', () => {
    for (const { esql } of [...queries, ...queriesExcludingMemory]) {
      expect(Parser.parse(esql).errors).toEqual([]);
    }
  });

  it('does not expose memory types unless exclusion is requested', () => {
    for (const { esql } of queries) {
      expect(esql).not.toContain('memory.session');
    }
    for (const { esql } of queriesExcludingMemory) {
      expect(esql).toContain(EXCLUDE_MEMORY_KI_TYPES_FILTER);
    }
  });

  it('uses named parameters instead of sample values', () => {
    const [hybrid, filter, count] = queries.map(({ esql }) => esql);
    expect(hybrid).toContain('?query');
    expect(hybrid).toMatch(/\| FORK\n[\s\S]*\| FUSE\n/);
    expect(filter).toContain('type == ?type AND MATCH(tags, ?tag)');
    expect(count).not.toContain('?');
  });
});
