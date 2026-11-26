/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERIES,
  CUSTOM_CONTENT_MAX_ESQL_QUERIES_TOTAL_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';
import {
  customContentStateSchema,
  customContentPanelUpdateSchema,
  customContentDataQueriesSchema,
} from './schema';

describe('customContentStateSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(customContentStateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts all fields populated', () => {
    expect(
      customContentStateSchema.safeParse({
        template: '<div>{{ row["rate"].value }}</div>',
        esql_query: ['FROM logs-* | STATS rate = AVG(error) BY host'],
      }).success
    ).toBe(true);
  });

  it('does not persist a prompt', () => {
    const parsed = customContentStateSchema.parse({
      prompt: 'Show error rate',
      template: '<div>hi</div>',
    });

    expect(parsed).not.toHaveProperty('prompt');
  });

  it('rejects a template exceeding CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH', () => {
    expect(
      customContentStateSchema.safeParse({
        template: 'a'.repeat(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an esql_query entry exceeding CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH', () => {
    expect(
      customContentStateSchema.safeParse({
        esql_query: ['a'.repeat(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH + 1)],
      }).success
    ).toBe(false);
  });

  it('accepts several esql_query entries up to the cap', () => {
    const queries = Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES }, (_, i) => `FROM a${i}`);
    expect(customContentStateSchema.safeParse({ esql_query: queries }).success).toBe(true);
  });

  it('rejects more esql_query entries than the cap', () => {
    const queries = Array.from(
      { length: CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1 },
      (_, i) => `FROM a${i}`
    );
    expect(customContentStateSchema.safeParse({ esql_query: queries }).success).toBe(false);
  });

  it('rejects queries that are each within the limit but too long together', () => {
    const half = CUSTOM_CONTENT_MAX_ESQL_QUERIES_TOTAL_LENGTH / 2;

    expect(
      customContentStateSchema.safeParse({ esql_query: ['a'.repeat(half), 'b'.repeat(half)] })
        .success
    ).toBe(true);
    expect(
      customContentStateSchema.safeParse({ esql_query: ['a'.repeat(half), 'b'.repeat(half + 1)] })
        .success
    ).toBe(false);
  });

  it('accepts an empty esql_query array', () => {
    expect(customContentStateSchema.safeParse({ esql_query: [] }).success).toBe(true);
  });
});

describe('customContentPanelUpdateSchema', () => {
  it('requires embeddable_id so the chat tool cannot act on the wrong panel', () => {
    expect(customContentPanelUpdateSchema.safeParse({ prompt: 'Make it blue' }).success).toBe(
      false
    );
  });

  it('accepts an update targeted at a panel', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', prompt: 'Make it blue' })
        .success
    ).toBe(true);
  });

  it('requires something to change', () => {
    expect(customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1' }).success).toBe(false);
  });

  it('accepts removing every query on its own', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', removeAllQueries: true })
        .success
    ).toBe(true);
  });

  it('rejects removeAllQueries together with dataQueries', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        removeAllQueries: true,
        dataQueries: [{ esql: 'FROM logs' }],
      }).success
    ).toBe(false);
  });

  it.each([
    [{ esqlQuery: 'FROM logs' }],
    [{ esqlQuery: null, prompt: 'x' }],
    [{ regenerateEsql: true }],
    [{ index: 'logs' }],
  ])('rejects the removed fields instead of dropping them: %j', (extra) => {
    const result = customContentPanelUpdateSchema.safeParse({
      embeddable_id: 'p1',
      prompt: 'Show it',
      ...extra,
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain('is no longer accepted');
  });

  it('rejects a prompt exceeding CUSTOM_CONTENT_MAX_PROMPT_LENGTH', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'a'.repeat(CUSTOM_CONTENT_MAX_PROMPT_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an empty prompt', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', prompt: '' }).success
    ).toBe(false);
  });
});

describe('customContentDataQueriesSchema', () => {
  it('accepts descriptions, supplied queries and empty entries', () => {
    expect(
      customContentDataQueriesSchema.safeParse([
        { description: 'totals', index: 'logs' },
        { esql: 'FROM logs | LIMIT 5' },
        {},
      ]).success
    ).toBe(true);
  });

  it('rejects an empty list and more data queries than a panel can hold', () => {
    expect(customContentDataQueriesSchema.safeParse([]).success).toBe(false);
    expect(
      customContentDataQueriesSchema.safeParse(
        Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1 }, () => ({ esql: 'FROM x' }))
      ).success
    ).toBe(false);
  });

  it('bounds the text of a data query', () => {
    expect(
      customContentDataQueriesSchema.safeParse([
        { description: 'a'.repeat(CUSTOM_CONTENT_MAX_PROMPT_LENGTH + 1) },
      ]).success
    ).toBe(false);
    expect(
      customContentDataQueriesSchema.safeParse([
        { esql: 'a'.repeat(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH + 1) },
      ]).success
    ).toBe(false);
    expect(customContentDataQueriesSchema.safeParse([{ index: 'a'.repeat(257) }]).success).toBe(
      false
    );
  });
});

describe('customContentDataQueriesSchema entries that would do nothing', () => {
  it.each([
    [[{ index: 'metrics-*' }]],
    [[{ description: '   ' }]],
    [[{ esql: '  ' }]],
    [[{ esql: 'FROM logs', index: 'logs' }]],
  ])('are rejected, so the call does not succeed on a no-op: %j', (entries) => {
    expect(customContentDataQueriesSchema.safeParse(entries).success).toBe(false);
  });

  it('still accepts an empty entry, which keeps the query at its position', () => {
    expect(customContentDataQueriesSchema.safeParse([{}, { description: 'totals' }]).success).toBe(
      true
    );
  });
});

describe('customContentPanelUpdateSchema data queries', () => {
  const parse = (input: Record<string, unknown>) =>
    customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', ...input });

  it('accepts data queries with a prompt', () => {
    expect(parse({ prompt: 'Show it', dataQueries: [{ description: 'totals' }] }).success).toBe(
      true
    );
  });

  it('counts data queries as a change', () => {
    expect(parse({ dataQueries: [{ esql: 'FROM logs' }] }).success).toBe(true);
  });

  it('needs a prompt when a data query has a description', () => {
    const result = parse({ dataQueries: [{ description: 'totals' }] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain('needs a prompt');
  });
});
