/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { buildFanoutMatrix, formatFanoutMatrix } = require('./get_fanout_matrix');

const CONNECTORS = {
  'eis-a': { config: { providerConfig: { model_id: 'a' } } },
  'eis-b': { config: { providerConfig: { model_id: 'b' } } },
  'eis-c': { config: { providerConfig: { model_id: 'c' } } },
};

const DISCOVERY = 'evals/discovery/discovery.spec.ts';
const QUERY_GEN = 'evals/ki_query_generation/ki_query_generation.spec.ts';
const EXTRACTION = 'evals/ki_feature_extraction/ki_feature_extraction.spec.ts';
const OTHER = 'evals/other/other.spec.ts';

const SHARDED_SUITE = {
  shards: [{ id: 's1', specFiles: [DISCOVERY, QUERY_GEN] }],
  specModelGroups: [
    { files: [DISCOVERY], models: ['eis/a', 'eis/b'] },
    { files: [QUERY_GEN], models: ['eis/a', 'eis/c'] },
  ],
  weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
};

const run = (overrides) =>
  buildFanoutMatrix({
    connectors: CONNECTORS,
    suiteInfo: SHARDED_SUITE,
    requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
    perSpec: true,
    grepOverride: false,
    ...overrides,
  });

describe('buildFanoutMatrix - weekly per-spec filter loop', () => {
  it('runs each spec only against the connectors its model list resolves to', () => {
    expect(run()).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY] },
      { connectorId: 'eis-c', shardId: 's1', specFiles: [QUERY_GEN] },
    ]);
  });

  it('uses the full weekly list for a shard spec with no specModelGroups[] entry', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's2', specFiles: [OTHER] }],
        specModelGroups: [{ files: [DISCOVERY], models: ['eis/a'] }],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 's2', specFiles: [OTHER] },
      { connectorId: 'eis-b', shardId: 's2', specFiles: [OTHER] },
      { connectorId: 'eis-c', shardId: 's2', specFiles: [OTHER] },
    ]);
  });

  it('ignores a specModelGroups[] file that is not in any shard when shards exist', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's1', specFiles: [QUERY_GEN] }],
        specModelGroups: [
          { files: [DISCOVERY], models: ['eis/b'] },
          { files: [QUERY_GEN], models: ['eis/a'] },
        ],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([{ connectorId: 'eis-a', shardId: 's1', specFiles: [QUERY_GEN] }]);
  });

  it('falls back to the requested universe when a shard spec has neither override nor weekly list', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's1', specFiles: [DISCOVERY, QUERY_GEN] }],
        specModelGroups: [{ files: [DISCOVERY], models: ['eis/a'] }],
      },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [QUERY_GEN] },
    ]);
  });

  it('keeps shards as batching boundaries', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [
          { id: 'sh1', specFiles: [DISCOVERY, QUERY_GEN] },
          { id: 'sh2', specFiles: [EXTRACTION] },
        ],
        specModelGroups: [
          { files: [DISCOVERY], models: ['eis/a', 'eis/b'] },
          { files: [QUERY_GEN], models: ['eis/a', 'eis/c'] },
          { files: [EXTRACTION], models: ['eis/b', 'eis/c'] },
        ],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 'sh1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 'sh1', specFiles: [DISCOVERY] },
      { connectorId: 'eis-c', shardId: 'sh1', specFiles: [QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 'sh2', specFiles: [EXTRACTION] },
      { connectorId: 'eis-c', shardId: 'sh2', specFiles: [EXTRACTION] },
    ]);
  });

  it('uses specModelGroups[].files as one virtual batch when there are no shards', () => {
    const GROK = 'evals/pattern_extraction/grok_pattern_extraction.spec.ts';
    const DISSECT = 'evals/pattern_extraction/dissect_pattern_extraction.spec.ts';
    const PARTITIONING = 'evals/partitioning/partitioning.spec.ts';

    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        specModelGroups: [{ files: [GROK, DISSECT], models: ['eis/a'] }, { files: [PARTITIONING] }],
        weeklyEisModelGroups: ['eis/a', 'eis/b'],
      },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: '', specFiles: [GROK, DISSECT, PARTITIONING] },
      { connectorId: 'eis-b', shardId: '', specFiles: [PARTITIONING] },
    ]);
  });
});

describe('buildFanoutMatrix - fail-fast', () => {
  it('throws when a listed spec model matches no connector', () => {
    expect(() =>
      buildFanoutMatrix({
        connectors: CONNECTORS,
        suiteInfo: {
          shards: [{ id: 's1', specFiles: [DISCOVERY, QUERY_GEN] }],
          specModelGroups: [
            { files: [DISCOVERY], models: ['eis/a'] },
            { files: [QUERY_GEN], models: ['eis/not-provisioned'] },
          ],
          weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
        },
        requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
        perSpec: true,
        grepOverride: false,
      })
    ).toThrow(/eis\/not-provisioned/);
  });

  it('throws when EVAL_MODEL_GROUPS matches no connector', () => {
    expect(() =>
      buildFanoutMatrix({
        connectors: CONNECTORS,
        suiteInfo: {},
        requestedModelGroups: ['eis/does-not-exist'],
        perSpec: false,
        grepOverride: false,
      })
    ).toThrow(/does-not-exist/);
  });
});

describe('buildFanoutMatrix - override / no-config parity', () => {
  it('runs every requested connector against every spec when not weekly (PR / on-demand)', () => {
    expect(run({ perSpec: false })).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-c', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
    ]);
  });

  it('uses the plain connector x shard fanout for a sharded suite with no model overrides', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: { shards: [{ id: 's1', specFiles: [DISCOVERY] }], specModelGroups: [] },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY] },
    ]);
  });

  it('emits one unsharded step per connector for a suite without shards', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {},
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: '', specFiles: [] },
      { connectorId: 'eis-b', shardId: '', specFiles: [] },
    ]);
  });

  it('disables shards and per-spec resolution under a manual grep override', () => {
    expect(run({ grepOverride: true })).toEqual([
      { connectorId: 'eis-a', shardId: '', specFiles: [] },
      { connectorId: 'eis-b', shardId: '', specFiles: [] },
      { connectorId: 'eis-c', shardId: '', specFiles: [] },
    ]);
  });

  it('selects every provisioned connector for an "all" request', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {},
      requestedModelGroups: ['all'],
      perSpec: false,
      grepOverride: false,
    });
    expect(rows.map((r) => r.connectorId)).toEqual(['eis-a', 'eis-b', 'eis-c']);
  });
});

describe('formatFanoutMatrix', () => {
  it('serializes rows as one JSON object per line (JSONL)', () => {
    expect(formatFanoutMatrix(run())).toBe(
      [
        JSON.stringify({ connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] }),
        JSON.stringify({ connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY] }),
        JSON.stringify({ connectorId: 'eis-c', shardId: 's1', specFiles: [QUERY_GEN] }),
      ].join('\n')
    );
  });

  it('keeps an empty shard id and spec list unambiguous (no tab collapsing)', () => {
    const rows = [{ connectorId: 'eis-a', shardId: '', specFiles: [] }];
    const line = formatFanoutMatrix(rows);

    expect(line).toBe('{"connectorId":"eis-a","shardId":"","specFiles":[]}');
    // The JSONL round-trips through the same fields run_suite.sh reads with jq.
    expect(JSON.parse(line)).toEqual({ connectorId: 'eis-a', shardId: '', specFiles: [] });
  });
});
