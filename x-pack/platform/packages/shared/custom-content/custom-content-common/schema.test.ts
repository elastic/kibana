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
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';
import {
  customContentStateSchema,
  customContentPanelUpdateSchema,
  customContentDatasetsSchema,
  readEsqlQuery,
  readAdditionalEsqlQueries,
  toEsqlQueryState,
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

  it('still requires at least one of prompt or esqlQuery', () => {
    expect(customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1' }).success).toBe(false);
  });

  it('accepts an esqlQuery on its own', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', esqlQuery: 'FROM logs-*' })
        .success
    ).toBe(true);
  });

  it('accepts regenerateEsql with a prompt and an index', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'Also show the error rate',
        regenerateEsql: true,
        index: 'logs-*',
      }).success
    ).toBe(true);
  });

  it('rejects regenerateEsql without a prompt', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        esqlQuery: 'FROM logs-*',
        regenerateEsql: true,
      }).success
    ).toBe(false);
  });

  it('rejects an edit whose only change is a blank esqlQuery', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', esqlQuery: '  ' }).success
    ).toBe(false);
  });

  it('accepts a blank esqlQuery next to a prompt, as not supplied', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'Make the badges blue',
        esqlQuery: '',
      }).success
    ).toBe(true);
  });

  it('rejects regenerateEsql together with esqlQuery: null', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'Show errors by host',
        esqlQuery: null,
        regenerateEsql: true,
      }).success
    ).toBe(false);
  });

  it('rejects an index longer than the limit', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'Show errors',
        index: 'x'.repeat(257),
      }).success
    ).toBe(false);
  });

  it('accepts a null esqlQuery to clear the query', () => {
    expect(
      customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', esqlQuery: null }).success
    ).toBe(true);
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

describe('esql_query accessors', () => {
  it('round-trips a single query', () => {
    expect(readEsqlQuery({ esql_query: toEsqlQueryState('FROM logs') })).toBe('FROM logs');
  });

  it('maps no query to an absent field rather than an empty array', () => {
    expect(toEsqlQueryState(undefined)).toBeUndefined();
  });

  it('reads undefined from a panel with no query', () => {
    expect(readEsqlQuery({})).toBeUndefined();
    expect(readEsqlQuery({ esql_query: [] })).toBeUndefined();
  });

  it('reads the main query and the additional ones separately', () => {
    const state = { esql_query: ['FROM a', 'FROM b', 'FROM c'] };
    expect(readEsqlQuery(state)).toBe('FROM a');
    expect(readAdditionalEsqlQueries(state)).toEqual(['FROM b', 'FROM c']);
  });

  it('reads no additional queries from a single-query or empty panel', () => {
    expect(readAdditionalEsqlQueries({ esql_query: ['FROM a'] })).toEqual([]);
    expect(readAdditionalEsqlQueries({})).toEqual([]);
  });

  it('keeps the additional queries after the main one when building state', () => {
    expect(toEsqlQueryState('FROM a', ['FROM b'])).toEqual(['FROM a', 'FROM b']);
  });

  it('drops the additional queries when there is no main query', () => {
    expect(toEsqlQueryState(undefined, ['FROM b'])).toBeUndefined();
  });
});

describe('customContentDatasetsSchema', () => {
  it('accepts descriptions, supplied queries and empty entries', () => {
    expect(
      customContentDatasetsSchema.safeParse([
        { description: 'totals', index: 'logs' },
        { esql: 'FROM logs | LIMIT 5' },
        {},
      ]).success
    ).toBe(true);
  });

  it('rejects an empty list and more datasets than a panel can hold', () => {
    expect(customContentDatasetsSchema.safeParse([]).success).toBe(false);
    expect(
      customContentDatasetsSchema.safeParse(
        Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1 }, () => ({ esql: 'FROM x' }))
      ).success
    ).toBe(false);
  });

  it('bounds the text of a dataset', () => {
    expect(
      customContentDatasetsSchema.safeParse([
        { description: 'a'.repeat(CUSTOM_CONTENT_MAX_PROMPT_LENGTH + 1) },
      ]).success
    ).toBe(false);
    expect(
      customContentDatasetsSchema.safeParse([
        { esql: 'a'.repeat(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH + 1) },
      ]).success
    ).toBe(false);
    expect(customContentDatasetsSchema.safeParse([{ index: 'a'.repeat(257) }]).success).toBe(false);
  });
});

describe('customContentPanelUpdateSchema datasets', () => {
  const parse = (input: Record<string, unknown>) =>
    customContentPanelUpdateSchema.safeParse({ embeddable_id: 'p1', ...input });

  it('accepts datasets with a prompt', () => {
    expect(parse({ prompt: 'Show it', datasets: [{ description: 'totals' }] }).success).toBe(true);
  });

  it('counts datasets as a change', () => {
    expect(parse({ datasets: [{ esql: 'FROM logs' }] }).success).toBe(true);
  });

  it('needs a prompt when a dataset has a description', () => {
    const result = parse({ datasets: [{ description: 'totals' }] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain('needs a prompt');
  });

  it.each([
    [{ esqlQuery: 'FROM logs' }],
    [{ esqlQuery: null }],
    [{ regenerateEsql: true }],
    [{ index: 'logs' }],
  ])('cannot be combined with the single-query fields: %j', (extra) => {
    const result = parse({ prompt: 'Show it', datasets: [{ esql: 'FROM a' }], ...extra });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain('datasets replaces');
  });
});
