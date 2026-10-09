/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationProposalSummary } from '../../../common/investigations/investigation';
import {
  buildHypothesisGraph,
  getHypothesisNodeId,
  getPathToNode,
  getWinningHypothesisIndex,
  HYPOTHESIS_TREE_NODE_IDS,
  sortProposals,
  type HypothesisTreeInput,
} from './build_hypothesis_graph';
import {
  HYPOTHESIS_TREE_NODE_WIDTH,
  HYPOTHESIS_TREE_ROW_GAP,
  HYPOTHESIS_TREE_SIBLING_GAP,
  layoutHypothesisGraph,
} from './layout_hypothesis_graph';

const proposal = (
  overrides: Partial<InvestigationProposalSummary> & Pick<InvestigationProposalSummary, 'id'>
): InvestigationProposalSummary => ({
  title: `Action ${overrides.id}`,
  comment: '',
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  created_at: '2026-07-28T14:00:00.000Z',
  ...overrides,
});

const completed: HypothesisTreeInput = {
  id: 'conv-1',
  title: 'Checkout latency spike',
  subjects: [
    {
      type: 'alert',
      id: 'alert-1',
      snapshot: { rule_name: 'Checkout latency' },
      created_at: '2026-07-28T14:00:00.000Z',
    },
  ],
  hypotheses: [
    { candidate: 'DNS failure', confidence: 0.1, status: 'dismissed' },
    { candidate: 'Pool exhaustion', confidence: 0.9, status: 'confirmed' },
    { candidate: 'Bad deploy', confidence: 0.6, status: 'confirmed' },
  ],
  conclusion: 'The pool was too small.',
  proposals: [proposal({ id: 'raise-pool', confidence: 'high' })],
  isRunning: false,
};

const kinds = (graph: ReturnType<typeof buildHypothesisGraph>) =>
  graph.nodes.map(({ data }) => data.kind);

describe('buildHypothesisGraph', () => {
  it('builds the full tree for a completed run with the hypotheses expanded', () => {
    const graph = buildHypothesisGraph({ input: completed, isHypothesesExpanded: true });

    expect(kinds(graph)).toEqual([
      'trigger',
      'hypotheses',
      'hypothesis',
      'hypothesis',
      'hypothesis',
      'conclusion',
      'actions',
    ]);
    // trigger→chip, chip→3 hypotheses, 2 confirmed hypotheses→conclusion, conclusion→actions
    expect(graph.edges).toHaveLength(7);
  });

  it('leads only confirmed hypotheses to the conclusion', () => {
    const { edges } = buildHypothesisGraph({
      input: {
        ...completed,
        hypotheses: [
          ...completed.hypotheses,
          { candidate: 'Bot traffic', confidence: 0.2, status: 'investigating' },
        ],
      },
      isHypothesesExpanded: true,
    });

    expect(
      edges
        .filter(({ target }) => target === HYPOTHESIS_TREE_NODE_IDS.conclusion)
        .map(({ source }) => source)
    ).toEqual([getHypothesisNodeId(1), getHypothesisNodeId(2)]);
  });

  it('feeds the conclusion from the chip when no hypothesis is confirmed', () => {
    const { edges } = buildHypothesisGraph({
      input: {
        ...completed,
        hypotheses: completed.hypotheses.map((hypothesis) => ({
          ...hypothesis,
          status: 'dismissed' as const,
        })),
      },
      isHypothesesExpanded: true,
    });

    expect(
      edges
        .filter(({ target }) => target === HYPOTHESIS_TREE_NODE_IDS.conclusion)
        .map(({ source }) => source)
    ).toEqual([HYPOTHESIS_TREE_NODE_IDS.hypotheses]);
  });

  it('expands the proposed actions by default', () => {
    const actions = buildHypothesisGraph({
      input: completed,
      isHypothesesExpanded: true,
    }).nodes.find(({ id }) => id === HYPOTHESIS_TREE_NODE_IDS.actions)?.data;

    expect(actions).toMatchObject({ kind: 'actions', isExpanded: true });
  });

  it('puts the subjects and the title on the trigger node', () => {
    const trigger = buildHypothesisGraph({ input: completed, isHypothesesExpanded: true }).nodes[0]
      .data;

    expect(trigger).toEqual({
      kind: 'trigger',
      subjects: completed.subjects,
      title: 'Checkout latency spike',
    });
  });

  it('follows the highest-confidence confirmed hypothesis as the happy path', () => {
    const graph = buildHypothesisGraph({ input: completed, isHypothesesExpanded: true });

    expect(graph.edges.filter(({ isHappyPath }) => isHappyPath).map(({ id }) => id)).toEqual([
      `${HYPOTHESIS_TREE_NODE_IDS.trigger}->${HYPOTHESIS_TREE_NODE_IDS.hypotheses}`,
      `${HYPOTHESIS_TREE_NODE_IDS.hypotheses}->${getHypothesisNodeId(1)}`,
      `${getHypothesisNodeId(1)}->${HYPOTHESIS_TREE_NODE_IDS.conclusion}`,
      `${HYPOTHESIS_TREE_NODE_IDS.conclusion}->${HYPOTHESIS_TREE_NODE_IDS.actions}`,
    ]);
  });

  it('connects the chip straight to the conclusion when the hypotheses are collapsed', () => {
    const graph = buildHypothesisGraph({ input: completed, isHypothesesExpanded: false });

    expect(kinds(graph)).toEqual(['trigger', 'hypotheses', 'conclusion', 'actions']);
    expect(graph.edges.map(({ id }) => id)).toContain(
      `${HYPOTHESIS_TREE_NODE_IDS.hypotheses}->${HYPOTHESIS_TREE_NODE_IDS.conclusion}`
    );
  });

  it('holds back the conclusion and actions while an agent is still working on it', () => {
    const graph = buildHypothesisGraph({
      input: { ...completed, isRunning: true },
      isHypothesesExpanded: true,
    });

    expect(kinds(graph)).not.toContain('conclusion');
    expect(kinds(graph)).not.toContain('actions');
    expect(graph.edges.some(({ isHappyPath }) => isHappyPath)).toBe(false);
  });

  it('feeds the actions from the hypotheses when there is no conclusion', () => {
    const graph = buildHypothesisGraph({
      input: { ...completed, conclusion: '   ' },
      isHypothesesExpanded: true,
    });

    expect(kinds(graph)).not.toContain('conclusion');
    expect(
      graph.edges.filter(({ target }) => target === HYPOTHESIS_TREE_NODE_IDS.actions)
    ).toHaveLength(2);
  });

  it('has no happy path when no hypothesis is confirmed', () => {
    const graph = buildHypothesisGraph({
      input: {
        ...completed,
        hypotheses: completed.hypotheses.map((hypothesis) => ({
          ...hypothesis,
          status: 'dismissed' as const,
        })),
      },
      isHypothesesExpanded: true,
    });

    expect(graph.edges.some(({ isHappyPath }) => isHappyPath)).toBe(false);
  });

  it('leaves the actions out without proposals', () => {
    const graph = buildHypothesisGraph({
      input: { ...completed, proposals: [] },
      isHypothesesExpanded: true,
    });

    expect(kinds(graph)).not.toContain('actions');
  });
});

describe('sortProposals', () => {
  it('puts the highest confidence first, the oldest first within one, and drops superseded ones', () => {
    const sorted = sortProposals([
      proposal({ id: 'low', confidence: 'low' }),
      proposal({ id: 'high-new', confidence: 'high', created_at: '2026-07-28T15:00:00.000Z' }),
      proposal({ id: 'old-revision', confidence: 'high', status: 'superseded' }),
      proposal({ id: 'high-old', confidence: 'high', created_at: '2026-07-28T13:00:00.000Z' }),
      proposal({ id: 'medium', confidence: 'medium' }),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['high-old', 'high-new', 'medium', 'low']);
  });
});

describe('getWinningHypothesisIndex', () => {
  it('returns -1 without a confirmed hypothesis', () => {
    expect(
      getWinningHypothesisIndex([{ candidate: 'x', confidence: 1, status: 'investigating' }])
    ).toBe(-1);
  });
});

describe('getPathToNode', () => {
  it('follows the happy path into the conclusion rather than every hypothesis', () => {
    const { edges } = buildHypothesisGraph({ input: completed, isHypothesesExpanded: true });

    const { nodeIds } = getPathToNode(edges, HYPOTHESIS_TREE_NODE_IDS.actions);

    expect([...nodeIds].sort()).toEqual(
      [
        HYPOTHESIS_TREE_NODE_IDS.actions,
        HYPOTHESIS_TREE_NODE_IDS.conclusion,
        getHypothesisNodeId(1),
        HYPOTHESIS_TREE_NODE_IDS.hypotheses,
        HYPOTHESIS_TREE_NODE_IDS.trigger,
      ].sort()
    );
  });

  it('follows every route when none of them is the happy path', () => {
    const { edges } = buildHypothesisGraph({
      input: { ...completed, hypotheses: [completed.hypotheses[0]] },
      isHypothesesExpanded: true,
    });

    const { nodeIds } = getPathToNode(edges, getHypothesisNodeId(0));

    expect(nodeIds).toEqual(
      new Set([
        getHypothesisNodeId(0),
        HYPOTHESIS_TREE_NODE_IDS.hypotheses,
        HYPOTHESIS_TREE_NODE_IDS.trigger,
      ])
    );
  });
});

describe('layoutHypothesisGraph', () => {
  it('stacks the rows on one centred spine and packs the hypothesis row edge to edge', () => {
    const graph = buildHypothesisGraph({ input: completed, isHypothesesExpanded: true });
    const heights = {
      [HYPOTHESIS_TREE_NODE_IDS.trigger]: 100,
      [HYPOTHESIS_TREE_NODE_IDS.hypotheses]: 80,
      [getHypothesisNodeId(0)]: 200,
      [getHypothesisNodeId(1)]: 240,
      [getHypothesisNodeId(2)]: 220,
    };

    const positioned = layoutHypothesisGraph(graph, heights);
    const byId = new Map(positioned.map((node) => [node.id, node]));

    expect(byId.get(HYPOTHESIS_TREE_NODE_IDS.trigger)?.position).toEqual({
      x: -HYPOTHESIS_TREE_NODE_WIDTH.trigger / 2,
      y: 0,
    });
    expect(byId.get(HYPOTHESIS_TREE_NODE_IDS.hypotheses)?.position.y).toBe(
      100 + HYPOTHESIS_TREE_ROW_GAP
    );

    const rowWidth = 3 * HYPOTHESIS_TREE_NODE_WIDTH.hypothesis + 2 * HYPOTHESIS_TREE_SIBLING_GAP;
    expect(byId.get(getHypothesisNodeId(0))?.position.x).toBe(-rowWidth / 2);
    expect(byId.get(getHypothesisNodeId(1))?.position.x).toBe(
      -rowWidth / 2 + HYPOTHESIS_TREE_NODE_WIDTH.hypothesis + HYPOTHESIS_TREE_SIBLING_GAP
    );

    // The conclusion row starts below the tallest hypothesis.
    expect(byId.get(HYPOTHESIS_TREE_NODE_IDS.conclusion)?.position.y).toBe(
      100 + 80 + 240 + 3 * HYPOTHESIS_TREE_ROW_GAP
    );
  });
});
