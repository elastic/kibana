/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_AI_INDEX_DEST } from '../../common/decision_trees';
import { createDecisionTreeStore } from './store';

const MERMAID = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| X1((Connection leak))
    D1 -->|no| X2((Slow query))`;

const MARKDOWN = `# Checkout high latency\n\n\`\`\`mermaid\n${MERMAID}\n\`\`\`\n`;

const TREE = parseMermaidDecisionTree(MERMAID, 'symptom:checkout-high-latency');

const learning: LearningRecord = {
  kind: 'remediation',
  content: 'Raise the pool size.',
  keywords: [],
};

const createEsClient = () => ({
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue({}),
  },
  get: jest.fn().mockResolvedValue({ found: false }),
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  index: jest.fn().mockResolvedValue({}),
});

const createStore = (esClient: ReturnType<typeof createEsClient>) =>
  createDecisionTreeStore({ esClient: esClient as never, logger: loggerMock.create() });

describe('commit', () => {
  it('creates version 1 and a head for a new tree', async () => {
    const esClient = createEsClient();

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'jdoe',
      summary: 'Initial tree.',
      learnings: [learning],
    });

    expect(detail.version).toBe(1);
    expect(detail.status).toBe('tentative');
    expect(detail.node_count).toBe(TREE.nodes.length);
    expect(detail.learnings).toEqual([learning]);

    const [versionCall, headCall] = esClient.index.mock.calls;
    expect(versionCall[0]).toMatchObject({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: 'dtree_checkout-high-latency_v1',
      document: expect.objectContaining({
        type: 'decision_tree_version',
        version: 1,
        author: 'jdoe',
        summary: 'Initial tree.',
        snapshot: MARKDOWN,
        learnings: [learning],
      }),
    });
    expect(headCall[0]).toMatchObject({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: 'dtree_checkout-high-latency',
      document: expect.objectContaining({ type: 'decision_tree', version: 1, content: MARKDOWN }),
    });
  });

  it('increments the version from the existing head', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: ['nightshift', 'decision-tree'],
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 2,
        status: 'tentative',
        node_count: 5,
        edge_count: 4,
        learnings: [],
      },
    });

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: true,
      author: 'jdoe',
      summary: 'Reinforced.',
      learnings: [],
    });

    expect(detail.version).toBe(3);
    // A confirmed causal path promotes the tree to established.
    expect(detail.status).toBe('established');
    expect(esClient.index.mock.calls[0][0].id).toBe('dtree_checkout-high-latency_v3');
  });

  it('merges learnings single-slot into the head', async () => {
    const esClient = createEsClient();
    const existingLearning: LearningRecord = {
      kind: 'system',
      category: 'dependency',
      content: 'Old fact.',
      keywords: [],
    };
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: ['nightshift', 'decision-tree'],
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 1,
        status: 'tentative',
        node_count: 5,
        edge_count: 4,
        learnings: [existingLearning],
      },
    });

    const updatedSystem: LearningRecord = {
      kind: 'system',
      category: 'dependency',
      content: 'New fact.',
      keywords: [],
    };

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'jdoe',
      summary: '',
      learnings: [updatedSystem, learning],
    });

    // The dependency slot is replaced, the remediation slot is added: two learnings, not three.
    expect(detail.learnings).toEqual([updatedSystem, learning]);
  });
});

describe('list', () => {
  it('maps head hits to summaries', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-09-09T12:00:00.000Z',
              type: 'decision_tree',
              title: 'Checkout High Latency',
              content: MARKDOWN,
              tags: ['nightshift', 'decision-tree'],
              tree_id: 'symptom:checkout-high-latency',
              symptom: 'checkout-high-latency',
              version: 2,
              status: 'established',
              node_count: 5,
              edge_count: 4,
              learnings: [learning],
            },
          },
        ],
      },
    });

    const trees = await createStore(esClient).list();

    expect(trees).toEqual([
      expect.objectContaining({
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 2,
        status: 'established',
        learning_count: 1,
      }),
    ]);
  });
});

describe('get', () => {
  it('extracts the mermaid from the head content', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: [],
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 1,
        status: 'tentative',
        node_count: 5,
        edge_count: 4,
        learnings: [],
      },
    });

    const tree = await createStore(esClient).get('symptom:checkout-high-latency');

    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dtree_checkout-high-latency' })
    );
    expect(tree?.markdown).toBe(MARKDOWN);
    expect(tree?.mermaid).toContain('flowchart TD');
  });

  it('returns undefined when the head is missing', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({ found: false });
    expect(await createStore(esClient).get('symptom:missing-tree')).toBeUndefined();
  });
});

describe('getVersion', () => {
  it('reads a version snapshot by its derived id', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree_version',
        title: 'Checkout High Latency v2',
        tags: [],
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 2,
        snapshot: MARKDOWN,
        author: 'jdoe',
        summary: 'Reinforced.',
        reinforced: true,
        node_count: 5,
        edge_count: 4,
        learnings: [],
      },
    });

    const version = await createStore(esClient).getVersion('symptom:checkout-high-latency', 2);

    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dtree_checkout-high-latency_v2' })
    );
    expect(version?.version).toBe(2);
    expect(version?.markdown).toBe(MARKDOWN);
    expect(version?.mermaid).toContain('flowchart TD');
  });
});

describe('archive', () => {
  it('flips the head status without adding a version', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: [],
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 2,
        status: 'established',
        node_count: 5,
        edge_count: 4,
        learnings: [],
      },
    });

    await createStore(esClient).archive('symptom:checkout-high-latency');

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dtree_checkout-high-latency',
        document: expect.objectContaining({ status: 'archived', version: 2 }),
      })
    );
  });
});
