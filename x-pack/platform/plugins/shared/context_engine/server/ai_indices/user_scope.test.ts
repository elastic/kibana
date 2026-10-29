/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  buildManagedVisibilityFilter,
  createVisibilityScopedClient,
  isManagedDest,
  readsOnlyManagedAiIndices,
} from './user_scope';

const ELASTIC = '.ai-index-idx-elastic-index';

describe('buildManagedVisibilityFilter', () => {
  const entryRules = (filter: ReturnType<typeof buildManagedVisibilityFilter>) =>
    JSON.parse(JSON.stringify(filter)).bool.should[1].nested.query.bool.filter[1].bool.should;

  it('counts the caller’s own principal as a held action', () => {
    const [, held] = entryRules(
      buildManagedVisibilityFilter({
        spaceId: 'default',
        authorizedActions: ['ai_index:dashboard/read'],
        principal: 'user://u_alice',
        isAdmin: false,
      })
    );

    expect(held.bool.filter[1].terms_set['permissions.kibana.privileges.name'].terms).toEqual([
      'ai_index:dashboard/read',
      'user://u_alice',
    ]);
  });

  it('lets only an administrator see other users’ scoped documents', () => {
    const access = { spaceId: 'default', authorizedActions: [], principal: 'user://u_alice' };

    expect(entryRules(buildManagedVisibilityFilter({ ...access, isAdmin: false }))).toHaveLength(2);
    const adminRules = entryRules(buildManagedVisibilityFilter({ ...access, isAdmin: true }));
    expect(adminRules).toHaveLength(3);
    expect(adminRules[2].bool.filter[0]).toEqual({
      prefix: { 'permissions.kibana.privileges.name': 'user://' },
    });
  });

  it('keeps minimum_should_match on the top-level should, which a filter context would drop', () => {
    expect(
      buildManagedVisibilityFilter({ spaceId: 's', authorizedActions: [], isAdmin: false })
    ).toMatchObject({ bool: { minimum_should_match: 1 } });
  });
});

describe('readsOnlyManagedAiIndices', () => {
  it.each([
    [`FROM ${ELASTIC} | WHERE type LIKE "memory.*" | KEEP id`, true],
    [`FROM ${ELASTIC} | INLINE STATS c = COUNT(*) BY type | SORT c DESC | LIMIT 5`, true],
    [`FROM ${ELASTIC}, ai-index-idx-test | KEEP id`, false],
    [`FROM ${ELASTIC}* | KEEP id`, false],
    [`FROM remote:${ELASTIC} | KEEP id`, false],
    [`FROM ${ELASTIC} | LOOKUP JOIN secrets ON id`, false],
    [`FROM ${ELASTIC} | ENRICH users`, false],
    ['FROM ai-index-idx-test', false],
    ['FROM', false],
  ])('%s → %s', (query, expected) => {
    expect(readsOnlyManagedAiIndices(query, [ELASTIC])).toBe(expected);
  });
});

describe('isManagedDest', () => {
  it('recognises the dot-prefixed managed indices only', () => {
    expect(isManagedDest({ type: 'index', value: ELASTIC })).toBe(true);
    expect(isManagedDest({ type: 'index', value: 'ai-index-idx-test' })).toBe(false);
  });
});

describe('createVisibilityScopedClient', () => {
  const visibility = { term: { owner: 'alice' } };

  it('filters every search and ES|QL query, keeping the caller’s own filter', async () => {
    const internal = elasticsearchServiceMock.createElasticsearchClient();
    const client = createVisibilityScopedClient(internal, visibility);

    await client.search({ index: ELASTIC, query: { term: { id: 'x' } } });
    await client.esql.query({ query: `FROM ${ELASTIC}` });

    expect(internal.search.mock.calls[0][0]).toEqual({
      index: ELASTIC,
      query: { bool: { filter: [visibility, { term: { id: 'x' } }] } },
    });
    expect(internal.esql.query.mock.calls[0][0]).toEqual({
      query: `FROM ${ELASTIC}`,
      filter: { bool: { filter: [visibility] } },
    });
  });

  it('writes as the internal client, and refuses reads that would skip the filter', async () => {
    const internal = elasticsearchServiceMock.createElasticsearchClient();
    const client = createVisibilityScopedClient(internal, visibility);

    await client.update({ index: ELASTIC, id: 'x', doc: {} });

    expect(internal.update).toHaveBeenCalledWith({ index: ELASTIC, id: 'x', doc: {} });
    expect(() => client.get).toThrow(/does not support "get"/);
    expect(() => client.msearch).toThrow(/does not support "msearch"/);
  });

  it('is not a thenable, so awaiting it returns the client', async () => {
    const internal = elasticsearchServiceMock.createElasticsearchClient();
    const client = createVisibilityScopedClient(internal, visibility);

    await expect(Promise.resolve(client)).resolves.toBe(client);
  });
});
