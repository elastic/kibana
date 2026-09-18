/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
import { materializeDecisionTrees, workspacePathForTree } from './materialize';
import type { DecisionTreeStore, DecisionTreeDetail } from './store';

const TREE: DecisionTreeDetail = {
  tree_id: 'symptom:checkout-high-latency',
  symptom: 'checkout-high-latency',
  title: 'Checkout High Latency',
  status: 'established',
  version: 3,
  node_count: 2,
  edge_count: 1,
  learning_count: 0,
  updated_at: '2026-09-09T12:00:00.000Z',
  markdown: '# Checkout\n\n```mermaid\nflowchart TD\n    S1([Latency]) --> X1((Pool))\n```\n',
  mermaid: '```mermaid\nflowchart TD\n    S1([Latency]) --> X1((Pool))\n```',
  learnings: [],
};

const createStore = (trees: DecisionTreeDetail[]): jest.Mocked<DecisionTreeStore> =>
  ({
    list: jest
      .fn()
      .mockResolvedValue(trees.map(({ markdown, mermaid, learnings, ...summary }) => summary)),
    get: jest
      .fn()
      .mockImplementation(async (treeId: string) => trees.find((tree) => tree.tree_id === treeId)),
    commit: jest.fn(),
    listVersions: jest.fn(),
    getVersion: jest.fn(),
    archive: jest.fn(),
  } as jest.Mocked<DecisionTreeStore>);

const createApiClient = () => ({
  mkdirs: jest.fn().mockResolvedValue([true]),
  writeFiles: jest.fn().mockResolvedValue([]),
});

describe('workspacePathForTree', () => {
  it('builds the absolute sandbox path from a tree id', () => {
    expect(workspacePathForTree('symptom:checkout-high-latency')).toBe(
      '/workspace/decision-trees/decision_tree_checkout-high-latency.md'
    );
  });
});

describe('materializeDecisionTrees', () => {
  it('writes an index and each tree file verbatim', async () => {
    const apiClient = createApiClient();

    const materialized = await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([TREE]),
      logger: loggerMock.create(),
    });

    expect(apiClient.mkdirs).toHaveBeenCalledWith('conv-1', ['/workspace/decision-trees']);
    expect(apiClient.writeFiles).toHaveBeenCalledWith('conv-1', [
      expect.objectContaining({ path: '/workspace/decision-trees/monitors.md' }),
      expect.objectContaining({
        path: '/workspace/decision-trees/decision_tree_checkout-high-latency.md',
      }),
    ]);

    const written = apiClient.writeFiles.mock.calls[0][1][1].content.toString('utf8');
    expect(written).toBe(TREE.markdown);
    expect(materialized).toHaveLength(1);
  });

  it('lists each tree by filename and symptom in the index table', async () => {
    const apiClient = createApiClient();

    await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([TREE]),
      logger: loggerMock.create(),
    });

    const index = apiClient.writeFiles.mock.calls[0][1][0].content.toString('utf8');
    expect(index).toContain('| Filename | Symptom |');
    expect(index).toContain('`decision_tree_checkout-high-latency.md`');
    expect(index).toContain('checkout-high-latency');
  });

  it('appends a reinforced learnings section built from the tree learnings', async () => {
    const apiClient = createApiClient();
    const learnings: LearningRecord[] = [
      {
        kind: 'system',
        category: 'dependency',
        content: 'Checkout calls payments synchronously.',
        keywords: [],
      },
      {
        kind: 'tool',
        category: 'query_pattern',
        connector_name: 'elasticsearch',
        content: 'Filter by data_stream.dataset before aggregating.',
        keywords: [],
      },
      { kind: 'remediation', content: 'Roll back the pool-size change.', keywords: [] },
    ];

    await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([{ ...TREE, learnings }]),
      logger: loggerMock.create(),
    });

    const file = apiClient.writeFiles.mock.calls[0][1][1].content.toString('utf8');
    expect(file).toContain('## Reinforced Learnings');
    expect(file).toContain('### System Learnings');
    expect(file).toContain('**dependency**');
    expect(file).toContain('Checkout calls payments synchronously.');
    expect(file).toContain('#### elasticsearch');
    expect(file).toContain('### Remediations');
    // The mermaid stays above the learnings so extractMermaid still finds it on resubmit.
    expect(file.indexOf('```mermaid')).toBeLessThan(file.indexOf('## Reinforced Learnings'));
  });

  it('re-renders the learnings section instead of stacking it on re-hydration', async () => {
    const apiClient = createApiClient();
    const markdown = `${TREE.markdown}\n## Reinforced Learnings\n\n_stale content_\n`;
    const learnings: LearningRecord[] = [
      { kind: 'remediation', content: 'Fresh remediation.', keywords: [] },
    ];

    await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([{ ...TREE, markdown, learnings }]),
      logger: loggerMock.create(),
    });

    const file = apiClient.writeFiles.mock.calls[0][1][1].content.toString('utf8');
    expect(file.match(/## Reinforced Learnings/g)).toHaveLength(1);
    expect(file).not.toContain('_stale content_');
    expect(file).toContain('Fresh remediation.');
  });

  it('skips archived trees so the agent never builds on a retired one', async () => {
    const apiClient = createApiClient();
    const store = createStore([{ ...TREE, status: 'archived' }]);

    const materialized = await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store,
      logger: loggerMock.create(),
    });

    expect(materialized).toEqual([]);
    expect(apiClient.writeFiles.mock.calls[0][1]).toHaveLength(1);
  });

  it('writes only the requested trees when treeIds is set', async () => {
    const apiClient = createApiClient();
    const other: DecisionTreeDetail = {
      ...TREE,
      tree_id: 'symptom:payment-errors',
      symptom: 'payment-errors',
    };

    const materialized = await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([TREE, other]),
      logger: loggerMock.create(),
      treeIds: ['symptom:checkout-high-latency'],
    });

    expect(materialized.map((tree) => tree.tree_id)).toEqual(['symptom:checkout-high-latency']);
    const paths = apiClient.writeFiles.mock.calls[0][1].map((file: { path: string }) => file.path);
    expect(paths).toEqual([
      '/workspace/decision-trees/monitors.md',
      '/workspace/decision-trees/decision_tree_checkout-high-latency.md',
    ]);
  });

  it('writes an empty index when treeIds is an empty list', async () => {
    const apiClient = createApiClient();

    const materialized = await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([TREE]),
      logger: loggerMock.create(),
      treeIds: [],
    });

    expect(materialized).toEqual([]);
    expect(apiClient.writeFiles.mock.calls[0][1]).toHaveLength(1);
  });

  it('still writes an index when there is nothing to hydrate', async () => {
    const apiClient = createApiClient();

    const materialized = await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([]),
      logger: loggerMock.create(),
    });

    expect(materialized).toEqual([]);
    const index = apiClient.writeFiles.mock.calls[0][1][0].content.toString('utf8');
    expect(index).toContain('No decision trees yet');
  });

  it('does not write files when the hydrate signal has already aborted', async () => {
    const apiClient = createApiClient();
    const signal = AbortSignal.abort();

    await expect(
      materializeDecisionTrees({
        apiClient: apiClient as never,
        conversationId: 'conv-1',
        store: createStore([TREE]),
        logger: loggerMock.create(),
        signal,
      })
    ).rejects.toThrow('Decision tree hydrate aborted');

    expect(apiClient.mkdirs).not.toHaveBeenCalled();
    expect(apiClient.writeFiles).not.toHaveBeenCalled();
  });
});
