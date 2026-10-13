/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import { MATCH_GROUP_COLUMNS, RESOLVED_TO_FIELD } from '../matcher/constants';
import { previewCustomRule } from './preview';

const INDEX = '.entities.v2.latest.default';
const SPEC: EsqlExpressionMatchSpec = {
  namespaces: ['local', 'active_directory'],
  matchValueExpression: 'TO_LOWER(user.name)',
};

interface Group {
  key: string;
  ids: string[];
  namespaces: string[];
  targets?: string[];
  unresolved?: number;
  local?: number;
  total?: number;
}

const MATCH_COLUMNS = [
  MATCH_GROUP_COLUMNS.matchValue,
  MATCH_GROUP_COLUMNS.ids,
  MATCH_GROUP_COLUMNS.unresolvedNs,
  MATCH_GROUP_COLUMNS.existingTargets,
  MATCH_GROUP_COLUMNS.unresolvedN,
  MATCH_GROUP_COLUMNS.unresolvedLocalN,
  MATCH_GROUP_COLUMNS.totalN,
].map((name) => ({ name, type: 'keyword' }));

const groupsResponse = (groups: Group[]) => ({
  columns: MATCH_COLUMNS,
  values: groups.map((group) => [
    group.key,
    group.ids,
    group.namespaces,
    group.targets ?? [],
    group.unresolved ?? group.ids.length,
    group.local ?? group.ids.filter((id) => id.endsWith('@local')).length,
    group.total ?? group.ids.length + (group.targets?.length ?? 0),
  ]),
});

const setup = (groups: Group[], aliasCounts: Record<string, number> = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockImplementation((async ({ query }: { query: string }) => {
    if (query.includes('STATS n = COUNT(*)')) {
      return {
        columns: [
          { name: 'n', type: 'long' },
          { name: RESOLVED_TO_FIELD, type: 'keyword' },
        ],
        values: Object.entries(aliasCounts).map(([id, n]) => [n, id]),
      };
    }
    return groupsResponse(groups);
  }) as never);
  esClient.search.mockImplementation((async ({ query }: { query: unknown }) => {
    const ids = (query as { bool: { filter: Array<{ terms: Record<string, string[]> }> } }).bool
      .filter[0].terms['entity.id'];
    return {
      hits: {
        hits: ids.map((id) => ({
          _source: { entity: { id, namespace: id.split('@').pop() } },
        })),
      },
    };
  }) as never);
  return esClient;
};

describe('previewCustomRule', () => {
  it('classifies groups the way the engine would', async () => {
    const esClient = setup([
      {
        key: 'jd12345',
        ids: [
          'user:JD12345@active_directory',
          'user:jd12345@HOST-A@local',
          'user:jd12345@HOST-B@local',
        ],
        namespaces: ['active_directory', 'local'],
      },
      {
        key: 'shared',
        ids: ['user:a@active_directory', 'user:b@active_directory'],
        namespaces: ['active_directory'],
      },
      {
        key: 'huge',
        ids: ['user:x@HOST-1@local'],
        namespaces: ['local'],
        total: 250,
      },
      {
        key: 'already-linked',
        ids: ['user:t@active_directory'],
        namespaces: ['active_directory'],
        targets: ['user:t@active_directory'],
        total: 2,
      },
    ]);

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview).toMatchObject({
      scanned_groups: 4,
      truncated: false,
      would_link_groups: 1,
      would_join_existing_groups: 0,
      would_merge_existing_groups: 0,
      skipped: { oversized: 1, same_namespace_duplicates: 1, nothing_to_link: 1 },
    });
    expect(preview.sample).toEqual([
      {
        match_value: 'jd12345',
        group_size: 3,
        target: 'user:JD12345@active_directory',
        aliases: ['user:jd12345@HOST-A@local', 'user:jd12345@HOST-B@local'],
        existing_targets: [],
        cascade_aliases: 0,
      },
    ]);
    expect(preview.not_modeled.length).toBeGreaterThan(0);
  });

  it('links same-namespace duplicates when the rule turns the check off', async () => {
    const esClient = setup([
      {
        key: 'jd12345',
        ids: ['user:jd12345@active_directory', 'user:jd12345_ha@active_directory'],
        namespaces: ['active_directory'],
      },
    ]);

    const preview = await previewCustomRule({
      esClient,
      index: INDEX,
      spec: { ...SPEC, declineSameNamespaceDuplicates: false },
    });

    expect(preview.would_link_groups).toBe(1);
    expect(preview.skipped.same_namespace_duplicates).toBe(0);
  });

  it('counts joins, merges and the aliases cascade would carry', async () => {
    const esClient = setup(
      [
        {
          key: 'merge',
          ids: ['user:m@HOST-1@local'],
          namespaces: ['local'],
          targets: ['user:m@active_directory', 'user:m@okta'],
        },
      ],
      { 'user:m@okta': 7 }
    );

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview.would_join_existing_groups).toBe(1);
    expect(preview.would_merge_existing_groups).toBe(1);
    expect(preview.sample[0]).toMatchObject({
      target: 'user:m@active_directory',
      cascade_aliases: 7,
    });
  });
});
