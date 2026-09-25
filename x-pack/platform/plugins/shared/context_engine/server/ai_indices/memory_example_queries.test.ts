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
    expect(queries.currentConversation.startsWith('FROM ai-index-idx-support')).toBe(true);
  });

  it('parses as valid ES|QL', () => {
    for (const esql of Object.values(queries)) {
      expect(Parser.parse(esql).errors).toEqual([]);
    }
  });
});
