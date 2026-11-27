/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDeltaItem } from '../../../../../common/types/api';
import { describeSource } from './describe_source';

const item = (overrides: Partial<CaseDeltaItem>): CaseDeltaItem => ({
  id: 'ua-1',
  category: 'changes',
  type: 'tags',
  action: 'update',
  createdAt: '2026-11-23T10:00:00.000Z',
  author: 'Sam',
  detail: null,
  count: 1,
  ...overrides,
});

describe('describeSource', () => {
  it.each([
    [
      'an alert with a rule',
      { category: 'alerts', type: 'comment', detail: 'Cred dump' },
      'Alert Cred dump',
    ],
    ['an alert without a rule', { category: 'alerts', type: 'comment' }, 'Alert'],
    ['a comment', { category: 'comments', type: 'comment' }, 'Comment by Sam'],
    [
      'a status change',
      { type: 'status', detail: 'in-progress' },
      'Status set to In progress by Sam',
    ],
    [
      'a severity change',
      { type: 'severity', detail: 'critical' },
      'Severity set to Critical by Sam',
    ],
    [
      'a file',
      { category: 'evidence', type: 'comment', detail: 'memdump.zip' },
      'File memdump.zip',
    ],
    [
      'observables',
      { category: 'evidence', type: 'observables', detail: 'add', count: 8 },
      '8 observables added',
    ],
    ['another change', { type: 'tags' }, 'Case change by Sam'],
    ['a status the UI does not know', { type: 'status', detail: 'mystery' }, 'Case change by Sam'],
  ] as Array<[string, Partial<CaseDeltaItem>, string]>)('describes %s', (_, overrides, text) => {
    expect(describeSource(item(overrides))).toBe(text);
  });
});
