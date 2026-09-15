/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidDecisionTree } from './mermaid';
import type { DecisionTreeView } from './types';

/** A submission may drop at most this share of the original node IDs. */
export const MAX_DROPPED_NODE_RATIO = 0.3;

/** A submission must retain at least this share of the original size, raw and parsed. */
export const MIN_RETAINED_SIZE_RATIO = 0.5;

/** Trees smaller than this are exempt from the parsed-size floor; the ratios are meaningless. */
const MIN_NODES_FOR_SIZE_FLOOR = 3;

const MAX_LEARNING_LINES = 4;

const MEMORY_REFERENCE_RE = /\bMEM_\d+\b/;

/** Raised when a submitted tree fails a guardrail. Carries the tree id for the caller's message. */
export class DecisionTreeValidationError extends Error {
  constructor(public readonly treeId: string, message: string) {
    super(message);
    this.name = 'DecisionTreeValidationError';
  }
}

/**
 * Rejects a submission whose raw Mermaid text collapsed against the original.
 * Cheap first line of defence before the text is parsed at all.
 */
export const enforceRawSizeFloor = ({
  treeId,
  originalMermaid,
  newMermaid,
}: {
  treeId: string;
  originalMermaid: string;
  newMermaid: string;
}): void => {
  if (!originalMermaid) {
    return;
  }
  if (newMermaid.length < MIN_RETAINED_SIZE_RATIO * originalMermaid.length) {
    throw new DecisionTreeValidationError(
      treeId,
      `Edited decision tree is less than ${MIN_RETAINED_SIZE_RATIO * 100}% of original size for ` +
        `${treeId}: ${newMermaid.length} chars vs ${originalMermaid.length} original chars`
    );
  }
};

/**
 * Rejects a submission whose *parsed* node or edge count collapsed.
 *
 * This is not redundant with the raw character floor: an unrecognized edge syntax can leave
 * the text full-size while the parsed graph silently collapses after disconnected-node
 * pruning, which the character count cannot see.
 */
export const enforceParsedSizeFloor = ({
  treeId,
  originalMermaid,
  newTree,
}: {
  treeId: string;
  originalMermaid: string;
  newTree: DecisionTreeView;
}): void => {
  const originalTree = tryParse(originalMermaid, treeId);
  if (!originalTree) {
    return;
  }

  const originalNodeCount = originalTree.nodes.length;
  const originalEdgeCount = originalTree.edges.length;
  if (originalNodeCount < MIN_NODES_FOR_SIZE_FLOOR) {
    return;
  }

  const newNodeCount = newTree.nodes.length;
  const newEdgeCount = newTree.edges.length;
  if (
    newNodeCount < MIN_RETAINED_SIZE_RATIO * originalNodeCount ||
    newEdgeCount < MIN_RETAINED_SIZE_RATIO * originalEdgeCount
  ) {
    throw new DecisionTreeValidationError(
      treeId,
      `Parsed decision tree collapsed for ${treeId}: ${newNodeCount} nodes / ${newEdgeCount} edges ` +
        `vs. ${originalNodeCount} / ${originalEdgeCount} original (below ` +
        `${MIN_RETAINED_SIZE_RATIO * 100}% of original parsed node or edge count). ` +
        `This usually indicates a Mermaid syntax the parser doesn't recognize.`
    );
  }
};

/**
 * Rejects a reinforcement submission that rewrote the tree instead of merging into it.
 * Some node loss is legitimate when the causal analysis calls out a misleading node, so the
 * budget is a ratio rather than zero.
 */
export const enforceNodePreservation = ({
  treeId,
  originalMermaid,
  newNodeIds,
}: {
  treeId: string;
  originalMermaid: string;
  newNodeIds: Set<string>;
}): void => {
  const originalTree = tryParse(originalMermaid, treeId);
  if (!originalTree) {
    return;
  }

  const originalNodeIds = originalTree.nodes.map((node) => node.node_id);
  if (originalNodeIds.length === 0) {
    return;
  }

  const missing = originalNodeIds.filter((nodeId) => !newNodeIds.has(nodeId));
  const missingRatio = missing.length / originalNodeIds.length;
  if (missingRatio > MAX_DROPPED_NODE_RATIO) {
    throw new DecisionTreeValidationError(
      treeId,
      `Edited decision tree drops more than ${
        MAX_DROPPED_NODE_RATIO * 100
      }% of original nodes for ` +
        `${treeId}: ${missing.length}/${originalNodeIds.length} missing ` +
        `(${Math.round(
          missingRatio * 100
        )}%). Preserve unrelated branches from the existing tree ` +
        `and apply only the structural edits required by the causal summary.`
    );
  }
};

/**
 * A tree the parser cannot read is not evidence that the *new* submission is bad, so the
 * guardrails that compare against it stand down rather than blocking the write.
 */
const tryParse = (mermaid: string, treeId: string): DecisionTreeView | undefined => {
  if (!mermaid) {
    return undefined;
  }
  try {
    return parseMermaidDecisionTree(mermaid, treeId);
  } catch {
    return undefined;
  }
};

/**
 * Normalizes a learning or remediation body, enforcing the 1-4 line budget and rejecting raw
 * `MEM_*` handles that mean nothing outside the originating conversation.
 * Returns an empty string for blank input, which callers treat as "nothing to record".
 */
export const validateShortText = (content: string, label: string): string => {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.split(/\r\n|\r|\n/).length > MAX_LEARNING_LINES) {
    throw new Error(`${label} must be 1-${MAX_LEARNING_LINES} lines`);
  }
  if (MEMORY_REFERENCE_RE.test(trimmed)) {
    throw new Error(
      `${label} must resolve raw memory references such as MEM_1 into plain language`
    );
  }
  return trimmed;
};

/** Rejects evidence metadata that still carries raw `MEM_*` handles. */
export const validateEvidenceMetadata = (treeId: string, entries: string[]): void => {
  if (entries.some((entry) => MEMORY_REFERENCE_RE.test(entry ?? ''))) {
    throw new DecisionTreeValidationError(
      treeId,
      'Decision tree updates must resolve raw memory references such as MEM_1 into plain language'
    );
  }
};
