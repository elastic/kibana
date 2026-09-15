/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { materializeDecisionTrees, workspacePathForTree } from './materialize';
import type { DecisionTreeStore, StoredDecisionTree } from './store';

const TREE: StoredDecisionTree = {
  tree_id: 'symptom:checkout-high-latency',
  symptom: 'checkout-high-latency',
  title: 'Checkout High Latency',
  status: 'established',
  corroborations: 3,
  updated_at: '2026-09-09T12:00:00.000Z',
  markdown: '# Checkout\n\n```mermaid\nflowchart TD\n    S1([Latency]) --> X1((Pool))\n```\n',
  mermaid: '```mermaid\nflowchart TD\n    S1([Latency]) --> X1((Pool))\n```',
};

const createStore = (trees: StoredDecisionTree[]): jest.Mocked<DecisionTreeStore> =>
  ({
    list: jest.fn().mockResolvedValue(trees.map(({ markdown, mermaid, ...summary }) => summary)),
    get: jest
      .fn()
      .mockImplementation(async (treeId: string) => trees.find((tree) => tree.tree_id === treeId)),
    upsert: jest.fn(),
    markVisited: jest.fn(),
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
      expect.objectContaining({ path: '/workspace/decision-trees/INDEX.md' }),
      expect.objectContaining({
        path: '/workspace/decision-trees/decision_tree_checkout-high-latency.md',
      }),
    ]);

    const written = apiClient.writeFiles.mock.calls[0][1][1].content.toString('utf8');
    expect(written).toBe(TREE.markdown);
    expect(materialized).toHaveLength(1);
  });

  it('lists each tree with its id in the index so the agent can submit it back', async () => {
    const apiClient = createApiClient();

    await materializeDecisionTrees({
      apiClient: apiClient as never,
      conversationId: 'conv-1',
      store: createStore([TREE]),
      logger: loggerMock.create(),
    });

    const index = apiClient.writeFiles.mock.calls[0][1][0].content.toString('utf8');
    expect(index).toContain('Checkout High Latency');
    expect(index).toContain('symptom:checkout-high-latency');
    expect(index).toContain('/workspace/decision-trees/decision_tree_checkout-high-latency.md');
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
});
