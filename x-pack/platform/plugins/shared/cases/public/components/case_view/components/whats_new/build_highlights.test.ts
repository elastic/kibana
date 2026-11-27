/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDeltaItem } from '../../../../../common/types/api';
import { buildHighlights } from './build_highlights';

let nextId = 0;
const item = (overrides: Partial<CaseDeltaItem>): CaseDeltaItem => ({
  id: `item-${nextId++}`,
  category: 'changes',
  type: 'status',
  action: 'update',
  createdAt: '2026-11-20T10:00:00.000Z',
  author: 'Sam',
  detail: null,
  count: 1,
  ...overrides,
});

const texts = (items: CaseDeltaItem[]) => buildHighlights(items).map(({ text }) => text);

describe('buildHighlights', () => {
  it('returns no highlights for no items', () => {
    expect(buildHighlights([])).toEqual([]);
  });

  it('lists the rule names of new alerts', () => {
    expect(
      texts([
        item({ category: 'alerts', type: 'comment', action: 'create', detail: 'Cred dump' }),
        item({ category: 'alerts', type: 'comment', action: 'create', detail: 'Cred dump' }),
        item({ category: 'alerts', type: 'comment', action: 'create', detail: 'Susp PS' }),
      ])
    ).toEqual(['3 alerts added: Cred dump, Susp PS']);
  });

  it('shortens a long list of rule names', () => {
    const alerts = ['A', 'B', 'C', 'D', 'E'].map((detail) =>
      item({ category: 'alerts', type: 'comment', action: 'create', detail })
    );

    expect(texts(alerts)).toEqual(['5 alerts added: A, B, C and 2 more']);
  });

  it('shows the latest status and severity with the author', () => {
    expect(
      texts([
        item({ type: 'status', detail: 'closed', author: 'Priya' }),
        item({ type: 'status', detail: 'in-progress', author: 'Sam' }),
        item({ type: 'severity', detail: 'critical', author: 'Sam' }),
      ])
    ).toEqual(['Status set to Closed by Priya', 'Severity set to Critical by Sam']);
  });

  it('counts the other case changes in one line', () => {
    expect(texts([item({ type: 'tags' }), item({ type: 'title' })])).toEqual([
      '2 other case changes',
    ]);
  });

  it('names the authors of new comments', () => {
    expect(
      texts([
        item({ category: 'comments', type: 'comment', action: 'create', author: 'Sam' }),
        item({ category: 'comments', type: 'comment', action: 'create', author: 'Priya' }),
        item({ category: 'comments', type: 'comment', action: 'create', author: 'Sam' }),
      ])
    ).toEqual(['3 comments from Sam, Priya']);
  });

  it('names new files and totals the observables by action', () => {
    expect(
      texts([
        item({ category: 'evidence', type: 'comment', action: 'create', detail: 'memdump.zip' }),
        item({ category: 'evidence', type: 'observables', detail: 'add', count: 8 }),
        item({ category: 'evidence', type: 'observables', detail: 'add', count: 4 }),
        item({ category: 'evidence', type: 'observables', detail: 'delete', count: 1 }),
      ])
    ).toEqual(['Files added: memdump.zip', '12 observables added', '1 observable removed']);
  });
});
