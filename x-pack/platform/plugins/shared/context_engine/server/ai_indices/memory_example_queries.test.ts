/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { buildMemoryExampleQueries } from './memory_example_queries';

describe('buildMemoryExampleQueries', () => {
  const queries = buildMemoryExampleQueries('ai-index-idx-support');

  it('targets the given AI index', () => {
    expect(
      queries.crossSession.startsWith('FROM ai-index-idx-support METADATA _id, _index, _score')
    ).toBe(true);
  });

  it('parses as valid ES|QL', () => {
    for (const esql of [
      ...Object.values(queries),
      ...Object.values(buildMemoryExampleQueries('ai-index-idx-support', { includeFacts: true })),
    ]) {
      expect(Parser.parse(esql).errors).toEqual([]);
    }
  });

  it('searches across sessions in session facts, and in long-term facts when there are any', () => {
    const withFacts = buildMemoryExampleQueries('ai-index-idx-support', { includeFacts: true });

    expect(queries.crossSession).toContain('\n| WHERE type == "memory.session_fact"\n');
    expect(withFacts.crossSession).toContain(
      '\n| WHERE type == "memory.session_fact" OR type LIKE "fact.*"\n'
    );
  });

  it('lists facts of one type and the most recent facts, newest first', () => {
    expect(queries.factsOfType).toContain('\n| WHERE type == "fact.<fact type>"\n');
    expect(queries.recentFacts).toContain('\n| WHERE type LIKE "fact.*"\n');
    for (const esql of [queries.factsOfType, queries.recentFacts]) {
      expect(esql).toContain('\n| WHERE @timestamp == latest_at\n');
      expect(esql).toContain('\n| SORT updated_at DESC, _id ASC\n');
    }
  });
});
