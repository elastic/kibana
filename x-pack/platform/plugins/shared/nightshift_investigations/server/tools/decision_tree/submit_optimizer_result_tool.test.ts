/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { DecisionTreeStore, DecisionTreeDetail } from '../../decision_trees/store';
import { createSubmitOptimizerResultTool } from './submit_optimizer_result_tool';

const TREE_ID = 'symptom:checkout-high-latency';
const FILE_PATH = 'decision-trees/decision_tree_checkout-high-latency.md';
const ABSOLUTE_PATH = `/workspace/${FILE_PATH}`;

const markdownFor = (mermaidBody: string) =>
  `# Checkout\n\n\`\`\`mermaid\n${mermaidBody}\n\`\`\`\n`;

const FULL_TREE = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| E2[Check deploys]
    D1 -->|no| E3[Profile queries]
    E2 --> X1((Connection leak))
    E3 --> X2((Slow query))`;

const stored = (mermaidBody: string): DecisionTreeDetail => ({
  tree_id: TREE_ID,
  symptom: 'checkout-high-latency',
  title: 'Checkout High Latency',
  status: 'tentative',
  version: 1,
  node_count: 5,
  edge_count: 4,
  learning_count: 0,
  updated_at: '2026-09-09T12:00:00.000Z',
  markdown: markdownFor(mermaidBody),
  mermaid: `\`\`\`mermaid\n${mermaidBody}\n\`\`\``,
  learnings: [],
});

const createStore = (existing?: DecisionTreeDetail): jest.Mocked<DecisionTreeStore> =>
  ({
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(existing),
    commit: jest.fn().mockResolvedValue(stored(FULL_TREE)),
    listVersions: jest.fn().mockResolvedValue([]),
    getVersion: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
  } as jest.Mocked<DecisionTreeStore>);

const createConnectionManager = (markdown: string) => ({
  readFiles: jest
    .fn()
    .mockResolvedValue([{ success: true, content: Buffer.from(markdown, 'utf8') }]),
});

const createContext = () => ({
  request: {} as never,
  runContext: { stack: [{ type: 'agent', conversationId: 'conv-1' }] },
  esClient: { asCurrentUser: {} },
  agentConfiguration: { connector_ids: [] },
});

const runSubmit = async ({
  store,
  markdown,
  submission,
}: {
  store: jest.Mocked<DecisionTreeStore>;
  markdown: string;
  submission?: Partial<{
    tree_id: string;
    file_path: string;
    evidence_gatherer_metadata: string[];
  }>;
}) => {
  const connectionManager = createConnectionManager(markdown);
  const tool = createSubmitOptimizerResultTool({
    connectionManager: connectionManager as never,
    getStore: () => store,
    getSpaceId: () => 'default',
    logger: loggerMock.create(),
  });

  const result = await tool.handler(
    {
      symptom_trees: [
        {
          tree_id: TREE_ID,
          file_path: FILE_PATH,
          evidence_gatherer_metadata: [],
          ...submission,
        },
      ],
      summary: 'Merged this run.',
    },
    createContext() as never
  );

  return { result, connectionManager };
};

describe('submit_optimizer_result', () => {
  it('reads the submitted file back from the sandbox and persists it', async () => {
    const store = createStore();

    const { result, connectionManager } = await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE),
    });

    expect(connectionManager.readFiles).toHaveBeenCalledWith(
      'default__conv-1',
      [expect.objectContaining({ path: ABSOLUTE_PATH })],
      expect.anything()
    );
    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        treeId: TREE_ID,
        markdown: markdownFor(FULL_TREE),
        author: 'system',
        summary: 'Merged this run.',
      })
    );
    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
  });

  it('marks the tree reinforced when the submission carries a causal path', async () => {
    const store = createStore();

    await runSubmit({
      store,
      markdown: markdownFor(FULL_TREE.replace('-->|yes|', '-->|✅ yes|')),
    });

    expect(store.commit).toHaveBeenCalledWith(expect.objectContaining({ reinforced: true }));
  });

  it('reports no changes when nothing was submitted', async () => {
    const store = createStore();
    const tool = createSubmitOptimizerResultTool({
      connectionManager: createConnectionManager('') as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      logger: loggerMock.create(),
    });

    const result = await tool.handler(
      { symptom_trees: [], summary: 'Tree already covers this run.' },
      createContext() as never
    );

    expect(store.commit).not.toHaveBeenCalled();
    expect('results' in result && result.results[0].data).toEqual(
      expect.objectContaining({ text: expect.stringContaining('No decision-tree changes') })
    );
  });

  it('keeps buffered learnings when a submission is rejected, then drains them on success', async () => {
    const store = createStore(stored(FULL_TREE));
    const peekLearnings = jest.fn().mockReturnValue([
      {
        kind: 'system',
        tree_id: TREE_ID,
        category: 'architecture',
        content: 'Checkout writes through a pool.',
        keywords: [],
      },
    ]);
    const drainLearnings = jest.fn().mockReturnValue([]);
    const tool = createSubmitOptimizerResultTool({
      connectionManager: createConnectionManager(
        markdownFor('flowchart TD\n    S1([Checkout latency]) --> E1[Query logs]')
      ) as never,
      getStore: () => store,
      getSpaceId: () => 'default',
      peekLearnings,
      drainLearnings,
      logger: loggerMock.create(),
    });

    const rejected = await tool.handler(
      {
        symptom_trees: [{ tree_id: TREE_ID, file_path: FILE_PATH, evidence_gatherer_metadata: [] }],
        summary: '',
      },
      createContext() as never
    );

    expect('results' in rejected && rejected.results[0].type).toBe(ToolResultType.error);
    expect(drainLearnings).not.toHaveBeenCalled();
    expect(store.commit).not.toHaveBeenCalled();

    const successTool = createSubmitOptimizerResultTool({
      connectionManager: createConnectionManager(markdownFor(FULL_TREE)) as never,
      getStore: () => createStore(),
      getSpaceId: () => 'default',
      peekLearnings,
      drainLearnings,
      logger: loggerMock.create(),
    });

    await successTool.handler(
      {
        symptom_trees: [{ tree_id: TREE_ID, file_path: FILE_PATH, evidence_gatherer_metadata: [] }],
        summary: 'Merged this run.',
      },
      createContext() as never
    );

    expect(drainLearnings).toHaveBeenCalledWith('default__conv-1');
  });

  describe('rejections', () => {
    const expectRejected = (result: unknown, reason: RegExp) => {
      const results = (result as { results: Array<{ type: string; data: { message: string } }> })
        .results;
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toMatch(reason);
    };

    it('rejects a tree id that is not symptom-prefixed', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { tree_id: 'monitor_id:881680' },
      });

      expectRejected(result, /must be formatted symptom:<slug>/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a symptom slug outside the 2-5 word budget', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: {
          tree_id: 'symptom:checkout',
          file_path: 'decision-trees/decision_tree_checkout.md',
        },
      });

      expectRejected(result, /must be 2-5 words/);
    });

    it('rejects a file outside the decision-tree directory', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { file_path: '/workspace/cortex/runbooks/checkout.md' },
      });

      expectRejected(result, /file_path for symptom:checkout-high-latency must be/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a submission that dropped most of the original nodes', async () => {
      const store = createStore(stored(FULL_TREE));

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(
          `flowchart TD\n    S9([Something else]) --> E9[New step]\n    E9 --> X9((New end))\n    E9 --> X8((Other end))\n    S9 --> E8[Another]\n    E8 --> X7((Third))`
        ),
      });

      expectRejected(result, /drops more than 30% of original nodes/);
      expect(store.commit).not.toHaveBeenCalled();
    });

    it('rejects a submission that shrank below half the original', async () => {
      const store = createStore(stored(FULL_TREE));

      const { result } = await runSubmit({
        store,
        markdown: markdownFor('flowchart TD\n    S1([Checkout latency]) --> E1[Query logs]'),
      });

      expectRejected(result, /less than 50% of original size/);
    });

    it('rejects evidence metadata that still carries a raw memory handle', async () => {
      const store = createStore();

      const { result } = await runSubmit({
        store,
        markdown: markdownFor(FULL_TREE),
        submission: { evidence_gatherer_metadata: ['E1: See MEM_4'] },
      });

      expectRejected(result, /must resolve raw memory references/);
    });

    it('rejects a file whose Mermaid cannot be found', async () => {
      const store = createStore();

      const { result } = await runSubmit({ store, markdown: '# Checkout\n\nNo diagram.\n' });

      expectRejected(result, /No Mermaid flowchart found/);
    });

    it('rejects a file the sandbox could not read', async () => {
      const store = createStore();
      const tool = createSubmitOptimizerResultTool({
        connectionManager: {
          readFiles: jest.fn().mockResolvedValue([{ success: false }]),
        } as never,
        getStore: () => store,
        getSpaceId: () => 'default',
        logger: loggerMock.create(),
      });

      const result = await tool.handler(
        {
          symptom_trees: [
            { tree_id: TREE_ID, file_path: FILE_PATH, evidence_gatherer_metadata: [] },
          ],
          summary: '',
        },
        createContext() as never
      );

      expectRejected(result, /Could not read submitted file/);
    });
  });
});
