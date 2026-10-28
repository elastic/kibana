/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customContentPanelKind } from '.';

describe('custom content panel kind content schema', () => {
  const parse = (input: Record<string, unknown>) =>
    customContentPanelKind.contentSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      ...input,
    });

  it('accepts a static panel that states it has no data', () => {
    expect(parse({ query: 'status card per host', hasData: false }).success).toBe(true);
  });

  it('accepts hasData and index to request a generated query', () => {
    expect(parse({ query: 'status card per host', hasData: true, index: 'logs-*' }).success).toBe(
      true
    );
  });

  it('accepts replacing or removing the query without a description', () => {
    expect(parse({ esql: 'FROM logs-*' }).success).toBe(true);
    expect(parse({ esql: null }).success).toBe(true);
    expect(parse({ hasData: false }).success).toBe(true);
  });

  it('accepts regenerateESQL with a description', () => {
    expect(parse({ query: 'also show errors', regenerateESQL: true }).success).toBe(true);
  });

  it('accepts datasets to ask for several queries', () => {
    expect(
      parse({
        query: 'totals above a host list',
        datasets: [{ description: 'totals', index: 'logs' }, { esql: 'FROM logs | LIMIT 5' }],
      }).success
    ).toBe(true);
  });

  it('rejects an empty datasets list and more datasets than a panel can hold', () => {
    expect(parse({ query: 'x', datasets: [] }).success).toBe(false);
    expect(
      parse({ query: 'x', datasets: Array.from({ length: 6 }, () => ({ esql: 'FROM a' })) }).success
    ).toBe(false);
  });

  it('rejects an index longer than the limit', () => {
    expect(parse({ query: 'status card', hasData: true, index: 'x'.repeat(257) }).success).toBe(
      false
    );
  });

  it('rejects an empty description', () => {
    expect(parse({ query: '' }).success).toBe(false);
  });
});
