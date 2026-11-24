/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertActionBelongsToSpace } from './assert_action_in_space';

const buildEsClient = (hit?: Record<string, unknown>) => {
  const search = jest.fn().mockResolvedValue({ hits: { hits: hit ? [{ _source: hit }] : [] } });

  return { search, client: { search } as any };
};

describe('assertActionBelongsToSpace', () => {
  it('matches on the child query action id only, never the parent action_id', async () => {
    const { client, search } = buildEsClient();

    await assertActionBelongsToSpace(client, 'child-1', 'default');

    const filters = search.mock.calls[0][0].query.bool.filter;
    expect(filters).toContainEqual({ term: { 'queries.action_id': 'child-1' } });
    expect(JSON.stringify(filters)).not.toContain('"action_id":"child-1"');
  });

  it('reports found with the expected agent count for the matching query', async () => {
    const { client } = buildEsClient({
      agents: ['a', 'b', 'c'],
      queries: [{ action_id: 'child-1', agents: ['a'] }],
    });

    await expect(assertActionBelongsToSpace(client, 'child-1', 'default')).resolves.toEqual({
      found: true,
      expectedAgentCount: 1,
    });
  });

  it('reports not found when no document is returned (negative control)', async () => {
    const { client } = buildEsClient();

    await expect(assertActionBelongsToSpace(client, 'other', 'default')).resolves.toEqual({
      found: false,
    });
  });
});
