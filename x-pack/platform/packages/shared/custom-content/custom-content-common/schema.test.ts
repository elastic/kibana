/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';
import {
  customContentStateSchema,
  customContentUpdateSchema,
  customContentPanelUpdateSchema,
  readEsqlQuery,
  toEsqlQueryState,
  resolveEsqlQueryEdit,
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

  it('rejects more than one esql_query', () => {
    expect(customContentStateSchema.safeParse({ esql_query: ['FROM a', 'FROM b'] }).success).toBe(
      false
    );
  });

  it('accepts an empty esql_query array', () => {
    expect(customContentStateSchema.safeParse({ esql_query: [] }).success).toBe(true);
  });
});

describe('customContentUpdateSchema', () => {
  it('accepts a prompt on its own', () => {
    expect(customContentUpdateSchema.safeParse({ prompt: 'Make it blue' }).success).toBe(true);
  });

  it('accepts an esqlQuery on its own', () => {
    expect(customContentUpdateSchema.safeParse({ esqlQuery: 'FROM logs-*' }).success).toBe(true);
  });

  // The dashboard tool targets the panel with its own `panelId`, so an identifier here would be
  // a second, redundant way to say the same thing.
  it('does not require a panel identifier', () => {
    expect(customContentUpdateSchema.safeParse({ prompt: 'Make it blue' }).success).toBe(true);
  });

  it('requires at least one of prompt or esqlQuery', () => {
    expect(customContentUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a null esqlQuery to clear the query', () => {
    expect(customContentUpdateSchema.safeParse({ esqlQuery: null }).success).toBe(true);
  });

  it('rejects a prompt exceeding CUSTOM_CONTENT_MAX_PROMPT_LENGTH', () => {
    expect(
      customContentUpdateSchema.safeParse({
        embeddable_id: 'p1',
        prompt: 'a'.repeat(CUSTOM_CONTENT_MAX_PROMPT_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an empty prompt', () => {
    expect(customContentUpdateSchema.safeParse({ embeddable_id: 'p1', prompt: '' }).success).toBe(
      false
    );
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
});

describe('resolveEsqlQueryEdit', () => {
  it('keeps the existing query when the edit omits it', () => {
    expect(resolveEsqlQueryEdit(undefined, 'FROM logs')).toEqual({
      query: 'FROM logs',
      isChanging: false,
    });
  });

  it('clears the query on null', () => {
    expect(resolveEsqlQueryEdit(null, 'FROM logs')).toEqual({ query: undefined, isChanging: true });
  });

  it('replaces the query with a supplied one', () => {
    expect(resolveEsqlQueryEdit('FROM metrics', 'FROM logs')).toEqual({
      query: 'FROM metrics',
      isChanging: true,
    });
  });

  // Distinguishing these two is the point of `isChanging`: both end with no query, but only the
  // second should make the resolver re-sample.
  it('distinguishes an omitted edit on a query-less panel from an explicit clear', () => {
    expect(resolveEsqlQueryEdit(undefined, undefined).isChanging).toBe(false);
    expect(resolveEsqlQueryEdit(null, undefined).isChanging).toBe(true);
  });
});
