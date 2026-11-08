/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import { MATCH_GROUP_COLUMNS, RESOLVED_TO_FIELD } from '../matcher/constants';
import { PREVIEW_MAX_PAGES, PREVIEW_SAMPLE_SIZE } from './constants';
import { previewCustomRule } from './preview';

const INDEX = '.entities.v2.latest.default';
const SPEC: EsqlExpressionMatchSpec = {
  namespaces: ['local', 'active_directory'],
  matchValueExpression: 'TO_LOWER(user.name)',
  declineSameNamespaceDuplicates: true,
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

const groupsResponse = (groups: Group[], isPartial = false) => ({
  ...(isPartial && { is_partial: true }),
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

// Only the ids the alias query actually asks about, so a query that names the
// wrong entities can't still return the expected count.
const idsInAliasQuery = (query: string): string[] => {
  const list = new RegExp(`${RESOLVED_TO_FIELD.replace(/\./g, '\\.')} IN \\(([^)]*)\\)`).exec(
    query
  )?.[1];
  return [...(list ?? '').matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(([, id]) => id);
};

const setup = (
  groups: Group[] | ((query: string) => Group[]),
  aliasCounts: Record<string, number> = {},
  { isPartial = false, isAliasQueryPartial = false } = {}
) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockImplementation((async ({ query }: { query: string }) => {
    if (query.includes('STATS alias_count = COUNT(*)')) {
      const asked = new Set(idsInAliasQuery(query));
      return {
        ...(isAliasQueryPartial && { is_partial: true }),
        columns: [
          { name: 'alias_count', type: 'long' },
          { name: RESOLVED_TO_FIELD, type: 'keyword' },
        ],
        values: Object.entries(aliasCounts)
          .filter(([id]) => asked.has(id))
          .map(([id, n]) => [n, id]),
      };
    }
    return groupsResponse(typeof groups === 'function' ? groups(query) : groups, isPartial);
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
      would_extend_existing_groups: 0,
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
        cascade_alias_count: 0,
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

    expect(preview.would_extend_existing_groups).toBe(1);
    expect(preview.would_merge_existing_groups).toBe(1);
    expect(preview.sample[0]).toMatchObject({
      target: 'user:m@active_directory',
      cascade_alias_count: 7,
    });
  });

  it('counts existing aliases only of the planned aliases, not of the target', async () => {
    const esClient = setup(
      [
        {
          key: 'merge',
          ids: ['user:m@HOST-1@local'],
          namespaces: ['local'],
          targets: ['user:m@active_directory', 'user:m@okta'],
        },
      ],
      { 'user:m@active_directory': 5, 'user:m@okta': 7 }
    );

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview.sample[0].cascade_alias_count).toBe(7);
  });

  it('lists each existing target once in the sample', async () => {
    const esClient = setup([
      {
        key: 'extend',
        ids: ['user:e@HOST-1@local'],
        namespaces: ['local'],
        targets: ['user:e@active_directory', 'user:e@active_directory', 'user:e@active_directory'],
        total: 4,
      },
    ]);

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview.sample[0].existing_targets).toEqual(['user:e@active_directory']);
  });

  it('reports partial results when only the alias count was partial', async () => {
    const esClient = setup(
      [
        {
          key: 'merge',
          ids: ['user:m@HOST-1@local'],
          namespaces: ['local'],
          targets: ['user:m@active_directory', 'user:m@okta'],
        },
      ],
      { 'user:m@okta': 7 },
      { isAliasQueryPartial: true }
    );

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview.partial).toBe(true);
  });

  it('reports partial results instead of failing', async () => {
    const esClient = setup(
      [
        {
          key: 'jd12345',
          ids: ['user:JD12345@active_directory', 'user:jd12345@HOST-A@local'],
          namespaces: ['active_directory', 'local'],
        },
      ],
      {},
      { isPartial: true }
    );

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC });

    expect(preview.partial).toBe(true);
    expect(preview.would_link_groups).toBe(1);
  });

  it('follows the cursor across pages, stops at the page limit, and samples the largest groups', async () => {
    const pageSize = 3;
    const keys = Array.from(
      { length: pageSize * (PREVIEW_MAX_PAGES + 2) },
      (_, i) => `user${String(i).padStart(3, '0')}`
    );
    // Group size grows with the key, so the largest groups are on the last pages read.
    const groupFor = (key: string, i: number): Group => ({
      key,
      ids: [
        `user:${key}@active_directory`,
        ...Array.from({ length: (i % 7) + 1 }, (_, host) => `user:${key}@HOST-${host}@local`),
      ],
      namespaces: ['active_directory', 'local'],
    });
    const cursors: Array<string | undefined> = [];
    const esClient = setup((query) => {
      const after = /match_value > "([^"]+)"/.exec(query)?.[1];
      cursors.push(after);
      const start = after === undefined ? 0 : keys.indexOf(after) + 1;
      return keys.slice(start, start + pageSize).map((key) => groupFor(key, keys.indexOf(key)));
    });

    const preview = await previewCustomRule({ esClient, index: INDEX, spec: SPEC, pageSize });

    expect(cursors).toEqual([
      undefined,
      ...keys
        .slice(0, pageSize * (PREVIEW_MAX_PAGES - 1))
        .filter((_, i) => i % pageSize === pageSize - 1),
    ]);
    expect(preview.truncated).toBe(true);
    expect(preview.scanned_groups).toBe(pageSize * PREVIEW_MAX_PAGES);
    expect(preview.would_link_groups).toBe(pageSize * PREVIEW_MAX_PAGES);
    expect(preview.sample).toHaveLength(PREVIEW_SAMPLE_SIZE);
    const sampledKeys = new Set(preview.sample.map(({ match_value: key }) => key));
    const sizeOf = (key: string) => groupFor(key, keys.indexOf(key)).ids.length;
    const scannedKeys = keys.slice(0, pageSize * PREVIEW_MAX_PAGES);
    const smallestSampled = Math.min(...[...sampledKeys].map(sizeOf));
    const largestLeftOut = Math.max(
      ...scannedKeys.filter((key) => !sampledKeys.has(key)).map(sizeOf)
    );
    expect(smallestSampled).toBeGreaterThanOrEqual(largestLeftOut);
  });

  it('stops between pages once the caller aborts', async () => {
    const controller = new AbortController();
    const esClient = setup(() => {
      controller.abort();
      return Array.from({ length: 2 }, (_, i) => ({
        key: `k${i}`,
        ids: [`user:k${i}@active_directory`, `user:k${i}@HOST-A@local`],
        namespaces: ['active_directory', 'local'],
      }));
    });

    await expect(
      previewCustomRule({
        esClient,
        index: INDEX,
        spec: SPEC,
        pageSize: 2,
        signal: controller.signal,
      })
    ).rejects.toThrow('aborted');
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });
});
