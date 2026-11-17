/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import { customContentPanelKind } from '.';

describe('custom content panel kind content schema', () => {
  const parse = (input: Record<string, unknown>) =>
    customContentPanelKind.contentSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      ...input,
    });

  it('accepts a static panel that says it has no data', () => {
    expect(parse({ query: 'status card per host', removeAllQueries: true }).success).toBe(true);
  });

  it('accepts data queries to request generated queries', () => {
    expect(
      parse({
        query: 'status card per host',
        dataQueries: [{ description: 'requests per host', index: 'logs-*' }],
      }).success
    ).toBe(true);
  });

  it('accepts replacing the queries without a description', () => {
    expect(parse({ dataQueries: [{ esql: 'FROM logs-*' }] }).success).toBe(true);
    expect(parse({ removeAllQueries: true }).success).toBe(true);
  });

  it.each([
    ['esql', { esql: 'FROM logs-*' }],
    ['hasData', { hasData: false }],
    ['regenerateESQL', { regenerateESQL: true }],
    ['index', { index: 'logs-*' }],
  ])('rejects the removed field %s instead of dropping it', (name, extra) => {
    const result = parse({ query: 'status card per host', ...extra });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ message }) => message).join()).toContain(
      `"${name}" is no longer accepted`
    );
  });

  it('rejects esql: null too, which used to remove the query', () => {
    expect(parse({ esql: null }).success).toBe(false);
  });

  it('lets a leftover that says nothing through', () => {
    expect(parse({ query: 'status card', dataQueries: [{}], index: '' }).success).toBe(true);
  });

  it('rejects an index longer than the limit', () => {
    expect(
      parse({
        query: 'status card',
        dataQueries: [{ description: 'totals', index: 'x'.repeat(257) }],
      }).success
    ).toBe(false);
  });

  it('rejects an empty description', () => {
    expect(parse({ query: '' }).success).toBe(false);
  });

  it('accepts data queries to ask for several queries', () => {
    expect(
      parse({
        query: 'totals above a host list',
        dataQueries: [{ description: 'totals', index: 'logs' }, { esql: 'FROM logs | LIMIT 5' }],
      }).success
    ).toBe(true);
  });

  it('rejects an empty data queries list and more data queries than a panel can hold', () => {
    expect(parse({ query: 'x', dataQueries: [] }).success).toBe(false);
    expect(
      parse({
        query: 'x',
        dataQueries: Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1 }, () => ({
          esql: 'FROM a',
        })),
      }).success
    ).toBe(false);
  });
});
