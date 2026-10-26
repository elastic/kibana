/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildKIQueryGenerationUserMessage,
  MAX_EXISTING_QUERIES_FOR_CONTEXT,
} from './build_ki_query_generation_user_message';

describe('buildKIQueryGenerationUserMessage', () => {
  const target = { slug: 'logs-test' };
  const existingQueries = Array.from({ length: MAX_EXISTING_QUERIES_FOR_CONTEXT + 5 }, (_, i) => ({
    id: `query-${i}`,
    title: 'Error rate',
    type: 'stats',
    severity_score: i,
    description: 'x'.repeat(250),
    esql: 'FROM logs.test | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
  }));

  const getSurfacedQueries = (maxExistingQueriesForContext?: number) => {
    const message =
      maxExistingQueriesForContext === undefined
        ? buildKIQueryGenerationUserMessage(target, existingQueries)
        : buildKIQueryGenerationUserMessage(target, existingQueries, maxExistingQueriesForContext);
    const [, context] = message.split('`existing_queries`:\n');
    return JSON.parse(context) as Array<{ severity_score: number; description: string }>;
  };

  it('omits existing_queries when there are none', () => {
    expect(buildKIQueryGenerationUserMessage(target, [])).toBe('`slug`: logs-test');
  });

  it('omits existing_queries when the override is 0', () => {
    expect(buildKIQueryGenerationUserMessage(target, existingQueries, 0)).toBe('`slug`: logs-test');
  });

  it('uses an override of 10', () => {
    const surfaced = getSurfacedQueries(10);

    expect(surfaced).toHaveLength(10);
    expect(surfaced[0].severity_score).toBe(MAX_EXISTING_QUERIES_FOR_CONTEXT + 4);
    expect(surfaced.at(-1)?.severity_score).toBe(MAX_EXISTING_QUERIES_FOR_CONTEXT - 5);
  });

  it('uses an explicit override of 50', () => {
    expect(getSurfacedQueries(50)).toHaveLength(50);
  });

  it('defaults to 50 and bounds descriptions when the override is omitted', () => {
    const surfaced = getSurfacedQueries();

    expect(surfaced).toHaveLength(MAX_EXISTING_QUERIES_FOR_CONTEXT);
    expect(surfaced.at(-1)?.severity_score).toBe(5);
    expect(surfaced[0].description).toHaveLength(200);
  });
});
