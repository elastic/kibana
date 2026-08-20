/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; the GNU Affero General Public License v3.0 only; and the Server Side
 * Public License v 1".
 */

import { assertActionBelongsToSpace } from './assert_action_in_space';

const searchResult = (source: unknown) => ({ hits: { hits: source ? [{ _source: source }] : [] } });

describe('assertActionBelongsToSpace', () => {
  it('accepts a per-query child action id recorded on the parent document', async () => {
    const search = jest.fn().mockResolvedValue(
      searchResult({
        action_id: 'parent-action-1',
        agents: ['a1', 'a2', 'a3'],
        queries: [{ action_id: 'query-action-9', agents: ['a1'] }],
      })
    );

    const result = await assertActionBelongsToSpace(
      { search } as never,
      'query-action-9',
      'default'
    );

    expect(result).toEqual({ found: true, expectedAgentCount: 1 });
  });

  it('rejects the parent action id — response and result docs carry only child ids', async () => {
    const search = jest.fn().mockResolvedValue(
      searchResult({
        action_id: 'parent-action-1',
        agents: ['a1', 'a2', 'a3'],
        queries: [{ action_id: 'query-action-9', agents: ['a1'] }],
      })
    );

    const result = await assertActionBelongsToSpace(
      { search } as never,
      'parent-action-1',
      'default'
    );

    // Polling with the parent id can never match child-only documents, so it
    // must not be accepted as a pollable query id.
    expect(result.found).toBe(false);
  });

  it('accepts a document whose own action_id is the query id', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(searchResult({ action_id: 'query-action-9', agents: ['a1'] }));

    const result = await assertActionBelongsToSpace(
      { search } as never,
      'query-action-9',
      'default'
    );

    expect(result).toEqual({ found: true, expectedAgentCount: 1 });
  });
});
