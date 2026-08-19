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
  specs: [
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
    specUniverse: [DISCOVERY, QUERY_GEN],
    ...overrides,
  });

describe('buildFanoutMatrix - per-spec mode', () => {
  it('runs each spec only against the connectors its model list resolves to', () => {
    expect(run()).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY] },
      { connectorId: 'eis-c', shardId: 's1', specFiles: [QUERY_GEN] },
    ]);
  });

  it('falls back to the suite weekly list for a spec with no `specs` override', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's2', specFiles: [OTHER] }],
        // An override elsewhere turns on per-spec mode; OTHER has none, so it uses the weekly list.
        specs: [{ files: [DISCOVERY], models: ['eis/a'] }],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
      specUniverse: [OTHER],
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 's2', specFiles: [OTHER] },
      { connectorId: 'eis-b', shardId: 's2', specFiles: [OTHER] },
      { connectorId: 'eis-c', shardId: 's2', specFiles: [OTHER] },
    ]);
  });

  it('falls back to the requested universe when neither spec nor suite defines groups', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's1', specFiles: [DISCOVERY, QUERY_GEN] }],
        // DISCOVERY's override turns on per-spec mode; QUERY_GEN has neither an override nor a weekly
        // list, so it falls back to the requested groups.
        specs: [{ files: [DISCOVERY], models: ['eis/a'] }],
      },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
      specUniverse: [DISCOVERY, QUERY_GEN],
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [QUERY_GEN] },
    ]);
  });

  it('groups specs by (shard, connector) so shards stay batching boundaries', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [
          { id: 'sh1', specFiles: [DISCOVERY, QUERY_GEN] },
          { id: 'sh2', specFiles: [EXTRACTION] },
        ],
        specs: [
          { files: [DISCOVERY], models: ['eis/a', 'eis/b'] },
          { files: [QUERY_GEN], models: ['eis/a', 'eis/c'] },
          { files: [EXTRACTION], models: ['eis/b', 'eis/c'] },
        ],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
      specUniverse: [DISCOVERY, QUERY_GEN, EXTRACTION],
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: 'sh1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 'sh1', specFiles: [DISCOVERY] },
      { connectorId: 'eis-c', shardId: 'sh1', specFiles: [QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 'sh2', specFiles: [EXTRACTION] },
      { connectorId: 'eis-c', shardId: 'sh2', specFiles: [EXTRACTION] },
    ]);
  });

  it('resolves per-spec models without shards, one step per connector', () => {
    const GROK = 'evals/pattern_extraction/grok_pattern_extraction.spec.ts';
    const DISSECT = 'evals/pattern_extraction/dissect_pattern_extraction.spec.ts';
    const PARTITIONING = 'evals/partitioning/partitioning.spec.ts';

    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        specs: [
          { files: [GROK, DISSECT], models: ['eis/a'] },
          { files: [PARTITIONING], models: ['eis/a', 'eis/b'] },
        ],
        weeklyEisModelGroups: ['eis/a', 'eis/b'],
      },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
      // OTHER has no override, so it falls back to the weekly list.
      specUniverse: [GROK, DISSECT, PARTITIONING, OTHER],
    });

    expect(rows).toEqual([
      { connectorId: 'eis-a', shardId: '', specFiles: [GROK, DISSECT, PARTITIONING, OTHER] },
      { connectorId: 'eis-b', shardId: '', specFiles: [PARTITIONING, OTHER] },
    ]);
  });
});

describe('buildFanoutMatrix - specs that resolve to no connector', () => {
  it('warns and drops a spec whose models match no connector, keeping the rest', () => {
    const warn = jest.fn();
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: {
        shards: [{ id: 's1', specFiles: [DISCOVERY, QUERY_GEN] }],
        specs: [
          { files: [DISCOVERY], models: ['eis/a'] },
          { files: [QUERY_GEN], models: ['eis/not-provisioned'] },
        ],
        weeklyEisModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      },
      requestedModelGroups: ['eis/a', 'eis/b', 'eis/c'],
      perSpec: true,
      grepOverride: false,
      specUniverse: [DISCOVERY, QUERY_GEN],
      warn,
    });

    expect(rows).toEqual([{ connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY] }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(QUERY_GEN));
  });
});

describe('buildFanoutMatrix - override / no-config parity', () => {
  it('runs every requested connector against every spec when perSpec is off', () => {
    expect(run({ perSpec: false })).toEqual([
      { connectorId: 'eis-a', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-b', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
      { connectorId: 'eis-c', shardId: 's1', specFiles: [DISCOVERY, QUERY_GEN] },
    ]);
  });

  it('uses the plain connector x shard fanout for a sharded suite with no model overrides', () => {
    const rows = buildFanoutMatrix({
      connectors: CONNECTORS,
      suiteInfo: { shards: [{ id: 's1', specFiles: [DISCOVERY] }], specs: [] },
      requestedModelGroups: ['eis/a', 'eis/b'],
      perSpec: true,
      grepOverride: false,
      specUniverse: [DISCOVERY],
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
  it('serializes rows as tab-separated connector, shard and space-joined spec files', () => {
    expect(formatFanoutMatrix(run())).toBe(
      [
        `eis-a\ts1\t${DISCOVERY} ${QUERY_GEN}`,
        `eis-b\ts1\t${DISCOVERY}`,
        `eis-c\ts1\t${QUERY_GEN}`,
      ].join('\n')
    );
  });

  it('leaves shard and spec fields empty for an unsharded step', () => {
    const rows = [{ connectorId: 'eis-a', shardId: '', specFiles: [] }];
    expect(formatFanoutMatrix(rows)).toBe('eis-a\t\t');
  });
});
