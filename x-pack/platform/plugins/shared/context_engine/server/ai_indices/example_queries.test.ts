/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { buildExampleQueries, EXCLUDE_MEMORY_KI_TYPES_FILTER } from './example_queries';

const LIFECYCLE =
  '| WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"\n| WHERE expires_at IS NULL OR expires_at > NOW()';

describe('buildExampleQueries', () => {
  const queries = buildExampleQueries({ type: 'index', value: 'ai-index-idx-support*' });
  const queriesExcludingMemory = buildExampleQueries(
    { type: 'index', value: 'ai-index-idx-support*' },
    { excludeMemory: true }
  );

  it('returns the three fixed shapes, targeting the given index', () => {
    expect(queries.map(({ title }) => title)).toEqual([
      'Full text search, lexical and semantic fused together (?query)',
      'Filter by knowledge item type and tag (?type, ?tag; tags is multi-valued, so MATCH)',
      'Count by type',
    ]);
    for (const { esql } of queries) {
      expect(
        esql.startsWith(`FROM ai-index-idx-support* METADATA _id, _index, _score\n${LIFECYCLE}\n`)
      ).toBe(true);
    }
  });

  it('collapses to the latest revision before the lifecycle filters on a data stream', () => {
    const [{ esql }] = buildExampleQueries({ type: 'data_stream', value: 'ai-index-ds-support' });

    expect(
      esql.startsWith(
        [
          'FROM ai-index-ds-support METADATA _id, _index, _score',
          '| EVAL id = COALESCE(id, _id)',
          '| INLINE STATS latest = MAX(@timestamp) BY id',
          '| WHERE @timestamp == latest',
          '| INLINE STATS latest_doc = MAX(_id) BY id',
          '| WHERE _id == latest_doc',
          '| DROP latest, latest_doc',
          LIFECYCLE,
          '| FORK',
        ].join('\n')
      )
    ).toBe(true);
    expect(Parser.parse(esql).errors).toEqual([]);
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
    for (const esql of [hybrid, filter, count]) {
      expect(esql.replace(LIFECYCLE, '')).not.toMatch(/"[^"]+"/);
    }
  });
});
