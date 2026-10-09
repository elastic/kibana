/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalConfidence } from '@kbn/proposals-common';
import type { Hypothesis, HypothesisStatus } from '../../../common/hypotheses/hypotheses';
import type {
  InvestigationProposalSummary,
  InvestigationSubjectResponse,
} from '../../../common/investigations/investigation';

/** What the tree is drawn from: the investigation as the query API returns it. */
export interface HypothesisTreeInput {
  /** The investigation (conversation) id. */
  id: string;
  /** The investigation's title, named by the trigger when it has no subjects. */
  title: string;
  subjects: readonly InvestigationSubjectResponse[];
  hypotheses: readonly Hypothesis[];
  /** The verdict, as markdown. */
  conclusion?: string;
  proposals: readonly InvestigationProposalSummary[];
  /** An agent is working on the investigation, so its conclusion and actions are drafts. */
  isRunning: boolean;
}

export type HypothesisStatusCounts = Record<HypothesisStatus, number>;

export type HypothesisTreeNodeData =
  | {
      kind: 'trigger';
      subjects: readonly InvestigationSubjectResponse[];
      title: string;
    }
  | {
      kind: 'hypotheses';
      total: number;
      counts: HypothesisStatusCounts;
      isExpanded: boolean;
    }
  | {
      kind: 'hypothesis';
      hypothesis: Hypothesis;
      index: number;
      isWinner: boolean;
    }
  | { kind: 'conclusion'; conclusion: string }
  | {
      kind: 'actions';
      /** Highest confidence first, so the front of the collapsed stack is the recommended one. */
      proposals: InvestigationProposalSummary[];
      isExpanded: boolean;
    };

export type HypothesisTreeNodeKind = HypothesisTreeNodeData['kind'];

export interface HypothesisGraphNode {
  id: string;
  data: HypothesisTreeNodeData;
}

export interface HypothesisGraphEdge {
  id: string;
  source: string;
  target: string;
  /** Part of Trigger → winning hypothesis → Conclusion → Actions. */
  isHappyPath: boolean;
}

export interface HypothesisGraph {
  nodes: HypothesisGraphNode[];
  edges: HypothesisGraphEdge[];
}

export const HYPOTHESIS_TREE_NODE_IDS = {
  trigger: 'trigger',
  hypotheses: 'hypotheses',
  conclusion: 'conclusion',
  actions: 'actions',
} as const;

export const getHypothesisNodeId = (index: number): string => `hypothesis-${index}`;

export const getHypothesisStatusCounts = (
  hypotheses: readonly Hypothesis[]
): HypothesisStatusCounts =>
  hypotheses.reduce<HypothesisStatusCounts>(
    (counts, { status }) => ({ ...counts, [status]: counts[status] + 1 }),
    { confirmed: 0, dismissed: 0, investigating: 0 }
  );

/** Index of the highest-confidence confirmed hypothesis, or -1 when none is confirmed. */
export const getWinningHypothesisIndex = (hypotheses: readonly Hypothesis[]): number =>
  hypotheses.reduce(
    (winner, hypothesis, index) =>
      hypothesis.status === 'confirmed' &&
      (winner === -1 || hypothesis.confidence > hypotheses[winner].confidence)
        ? index
        : winner,
    -1
  );

const CONFIDENCE_RANK: Record<ProposalConfidence, number> = { high: 3, medium: 2, low: 1 };

/**
 * The proposed actions to draw, highest confidence first and, within one confidence, oldest first.
 * A superseded proposal was replaced by a revision, which is drawn instead.
 */
export const sortProposals = (
  proposals: readonly InvestigationProposalSummary[]
): InvestigationProposalSummary[] =>
  proposals
    .filter(({ status }) => status !== 'superseded')
    .sort(
      (first, second) =>
        CONFIDENCE_RANK[second.confidence] - CONFIDENCE_RANK[first.confidence] ||
        first.created_at.localeCompare(second.created_at)
    );

const createEdge = (source: string, target: string, isHappyPath: boolean): HypothesisGraphEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  isHappyPath,
});

/**
 * Builds the hypothesis tree: Trigger → Hypotheses chip → one flat row of hypotheses →
 * Conclusion → Proposed actions. Only confirmed hypotheses lead to the conclusion. Conclusion and actions are drafts until the run ends, so they are
 * left out while it is still running.
 */
export const buildHypothesisGraph = ({
  input: { title, subjects, hypotheses, conclusion, proposals, isRunning },
  isHypothesesExpanded,
  isActionsExpanded = true,
}: {
  input: HypothesisTreeInput;
  isHypothesesExpanded: boolean;
  isActionsExpanded?: boolean;
}): HypothesisGraph => {
  const sortedProposals = sortProposals(proposals);
  const winnerIndex = getWinningHypothesisIndex(hypotheses);
  const hasWinner = !isRunning && winnerIndex !== -1;
  const showHypothesisRow = isHypothesesExpanded && hypotheses.length > 0;

  const nodes: HypothesisGraphNode[] = [
    { id: HYPOTHESIS_TREE_NODE_IDS.trigger, data: { kind: 'trigger', subjects, title } },
    {
      id: HYPOTHESIS_TREE_NODE_IDS.hypotheses,
      data: {
        kind: 'hypotheses',
        total: hypotheses.length,
        counts: getHypothesisStatusCounts(hypotheses),
        isExpanded: showHypothesisRow,
      },
    },
  ];
  const edges: HypothesisGraphEdge[] = [
    createEdge(HYPOTHESIS_TREE_NODE_IDS.trigger, HYPOTHESIS_TREE_NODE_IDS.hypotheses, hasWinner),
  ];

  if (showHypothesisRow) {
    hypotheses.forEach((hypothesis, index) => {
      const id = getHypothesisNodeId(index);
      const isWinner = hasWinner && index === winnerIndex;
      nodes.push({ id, data: { kind: 'hypothesis', hypothesis, index, isWinner } });
      edges.push(createEdge(HYPOTHESIS_TREE_NODE_IDS.hypotheses, id, isWinner));
    });
  }

  if (isRunning) {
    return { nodes, edges };
  }

  // Only a confirmed hypothesis leads to the conclusion. Without one, the chip does, so the
  // conclusion stays connected.
  const leadingIds = hypotheses.flatMap(({ status }, index) =>
    status === 'confirmed' ? [getHypothesisNodeId(index)] : []
  );
  const feedingIds =
    showHypothesisRow && leadingIds.length > 0 ? leadingIds : [HYPOTHESIS_TREE_NODE_IDS.hypotheses];
  const happyFeedingId =
    feedingIds[0] === HYPOTHESIS_TREE_NODE_IDS.hypotheses
      ? HYPOTHESIS_TREE_NODE_IDS.hypotheses
      : getHypothesisNodeId(winnerIndex);
  const isFeedingHappy = (id: string): boolean => hasWinner && id === happyFeedingId;

  const conclusionText = conclusion?.trim();
  if (conclusionText) {
    nodes.push({
      id: HYPOTHESIS_TREE_NODE_IDS.conclusion,
      data: { kind: 'conclusion', conclusion: conclusionText },
    });
    feedingIds.forEach((id) =>
      edges.push(createEdge(id, HYPOTHESIS_TREE_NODE_IDS.conclusion, isFeedingHappy(id)))
    );
  }

  if (sortedProposals.length > 0) {
    nodes.push({
      id: HYPOTHESIS_TREE_NODE_IDS.actions,
      data: { kind: 'actions', proposals: sortedProposals, isExpanded: isActionsExpanded },
    });
    if (conclusionText) {
      edges.push(
        createEdge(HYPOTHESIS_TREE_NODE_IDS.conclusion, HYPOTHESIS_TREE_NODE_IDS.actions, hasWinner)
      );
    } else {
      feedingIds.forEach((id) =>
        edges.push(createEdge(id, HYPOTHESIS_TREE_NODE_IDS.actions, isFeedingHappy(id)))
      );
    }
  }

  return { nodes, edges };
};

/**
 * Edges leading into `nodeId` from the Trigger. Where several edges converge (the Conclusion),
 * the happy-path edge is followed when there is one, so selecting a node lights up one route.
 */
export const getPathToNode = (
  edges: readonly HypothesisGraphEdge[],
  nodeId: string
): { nodeIds: Set<string>; edgeIds: Set<string> } => {
  const nodeIds = new Set<string>([nodeId]);
  const edgeIds = new Set<string>();
  const queue = [nodeId];

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    const incoming = edges.filter(({ target }) => target === current);
    const happyIncoming = incoming.filter(({ isHappyPath }) => isHappyPath);
    (happyIncoming.length > 0 ? happyIncoming : incoming).forEach(({ id, source }) => {
      edgeIds.add(id);
      if (!nodeIds.has(source)) {
        nodeIds.add(source);
        queue.push(source);
      }
    });
  }

  return { nodeIds, edgeIds };
};
