/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DecisionEdgeView,
  DecisionNodeType,
  DecisionNodeView,
  DecisionTreeView,
} from './types';

/**
 * Node shapes encode the node type, so a shape mismatch silently changes semantics.
 * Order matters: `([...])` and `((...))` must be tried before the bare `[...]`
 * evidence shape, which would otherwise match their inner brackets.
 */
const NODE_PATTERNS: ReadonlyArray<readonly [DecisionNodeType, RegExp]> = [
  ['symptom', /([A-Za-z]\w*)\(\[(.+?)\]\)/],
  ['end', /([A-Za-z]\w*)\(\((.+?)\)\)/],
  // Tolerate both the single-brace `{label}` and double-brace `{{label}}` decision shapes.
  ['decision', /([A-Za-z]\w*)\{\{?(.+?)\}?\}/],
  ['evidence_gatherer', /([A-Za-z]\w*)\[(.+?)\]/],
];

/**
 * Splits a line on its arrow, capturing an optional condition label in either
 * Mermaid syntax: `A -->|condition| B` or `A -- "condition" --> B`.
 */
const ARROW_RE =
  /^(?<left>.+?)\s*(?:--\s*"?(?<dashCondition>[^"|>]+?)"?\s*)?(?:-->|---)\s*(?:\|(?<pipeCondition>[^|]*)\|\s*)?(?<right>.+)$/;

const TAKEN_PREFIX = '\u2705';

const BARE_ID_RE = /^([A-Za-z]\w*)$/;

/** Display-only usage counters some renderers append; never persisted into a label. */
const STATS_SUFFIX_RE = /\s*\u00b7\s*visits\s+\d+\s*\u00b7\s*reinforced\s+\d+\s*$/;

const SKIPPED_LINE_PREFIXES = ['flowchart', '%%', 'style ', 'classDef ', 'class '];

const LINE_TERMINATOR = /\r\n|[\n\r\v\f\u001c-\u001e\u0085\u2028\u2029]/g;

/** Splits text into lines while keeping each line's terminator, like Python's splitlines(keepends=True). */
const splitLinesKeepEnds = (text: string): string[] => {
  const lines: string[] = [];
  const terminator = new RegExp(LINE_TERMINATOR.source, 'g');
  let start = 0;
  let match = terminator.exec(text);
  while (match !== null) {
    const end = match.index + match[0].length;
    lines.push(text.slice(start, end));
    start = end;
    match = terminator.exec(text);
  }
  if (start < text.length) {
    lines.push(text.slice(start));
  }
  return lines;
};

const FENCE_OPENER_RE = /^[ \t]*(`{3,}|~{3,})[ \t]*mermaid[ \t]*$/i;

/**
 * Pulls the single Mermaid block out of a decision-tree markdown file, fences included.
 * Falls back to a bare `flowchart TD` body when the file carries no fences at all.
 *
 * Throws when the file has an unterminated fence or more than one Mermaid block, because
 * both mean the agent's edit corrupted the file and persisting it would lose the tree.
 */
export const extractMermaid = (markdown: string): string => {
  const mermaidBlocks: string[] = [];
  let inMermaidBlock = false;
  let openingFence = '';
  let blockLines: string[] = [];

  for (const line of splitLinesKeepEnds(markdown)) {
    const lineWithoutNewline = line.trimEnd();

    if (inMermaidBlock) {
      const stripped = lineWithoutNewline.trim();
      const fenceChar = openingFence[0];
      const isClosingFence =
        stripped.length >= openingFence.length &&
        stripped.length > 0 &&
        [...stripped].every((char) => char === fenceChar);

      if (isClosingFence) {
        mermaidBlocks.push([...blockLines, line].join('').trim());
        inMermaidBlock = false;
        openingFence = '';
        blockLines = [];
      } else {
        blockLines.push(line);
      }
      continue;
    }

    const opener = FENCE_OPENER_RE.exec(lineWithoutNewline);
    if (opener) {
      inMermaidBlock = true;
      openingFence = opener[1];
      blockLines = [line];
    }
  }

  if (inMermaidBlock) {
    throw new Error('Malformed Mermaid code fence in decision-tree file');
  }
  if (mermaidBlocks.length > 1) {
    throw new Error('Multiple Mermaid code fences found in decision-tree file');
  }
  if (mermaidBlocks.length === 1) {
    return mermaidBlocks[0];
  }

  const flowchart = /(flowchart\s+TD[\s\S]*)/i.exec(markdown);
  if (flowchart) {
    return flowchart[1].trim();
  }
  throw new Error('No Mermaid flowchart found in decision-tree file');
};

interface ParsedNode {
  nodeId: string;
  nodeType: DecisionNodeType;
  label: string;
}

const tryParseNode = (text: string): ParsedNode | undefined => {
  const trimmed = text.trim();
  for (const [nodeType, pattern] of NODE_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) {
      return { nodeId: match[1], nodeType, label: match[2].trim() };
    }
  }
  return undefined;
};

const extractNodeId = (text: string): string | undefined => {
  const trimmed = text.trim();
  const bare = BARE_ID_RE.exec(trimmed);
  if (bare) {
    return bare[1];
  }
  return tryParseNode(trimmed)?.nodeId;
};

/**
 * Parses a Mermaid `flowchart TD` diagram into nodes and edges.
 *
 * Deliberately lenient, matching the reference implementation: unrecognized lines are
 * skipped, duplicate node definitions collapse with the last winning, and IDs referenced
 * only from edges are backfilled as evidence nodes so the graph stays connected.
 */
export const parseMermaidDecisionTree = (
  mermaidText: string,
  treeId: string = ''
): DecisionTreeView => {
  const nodes = new Map<string, DecisionNodeView>();
  const edges: DecisionEdgeView[] = [];

  const body = mermaidText.replace(/```mermaid\s*/g, '').replace(/```\s*$/, '');

  const registerNode = (text: string): string | undefined => {
    const parsed = tryParseNode(text);
    if (!parsed) {
      return undefined;
    }
    nodes.set(parsed.nodeId, {
      node_id: parsed.nodeId,
      node_type: parsed.nodeType,
      label: parsed.label.replace(STATS_SUFFIX_RE, ''),
    });
    return parsed.nodeId;
  };

  for (const rawLine of body.split(LINE_TERMINATOR)) {
    const line = rawLine.trim();
    if (!line || SKIPPED_LINE_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      continue;
    }

    const arrowMatch = ARROW_RE.exec(line);
    if (!arrowMatch?.groups) {
      registerNode(line);
      continue;
    }

    const { left, dashCondition, pipeCondition, right } = arrowMatch.groups;
    const rawCondition = (dashCondition ?? pipeCondition ?? '').trim();

    const sourceId = registerNode(left.trim()) ?? extractNodeId(left);
    const targetId = registerNode(right.trim()) ?? extractNodeId(right);
    if (!sourceId || !targetId) {
      continue;
    }

    let condition = rawCondition.replace(/^["']|["']$/g, '').trim();
    const isTaken = condition.startsWith(TAKEN_PREFIX);
    if (isTaken) {
      condition = condition.slice(TAKEN_PREFIX.length).trim();
    }

    edges.push({
      source_node_id: sourceId,
      target_node_id: targetId,
      condition: condition || 'next',
      is_taken: isTaken,
    });
  }

  for (const edge of edges) {
    for (const referencedId of [edge.source_node_id, edge.target_node_id]) {
      if (!nodes.has(referencedId)) {
        nodes.set(referencedId, {
          node_id: referencedId,
          node_type: 'evidence_gatherer',
          label: referencedId,
        });
      }
    }
  }

  return {
    tree_id: treeId,
    ...pruneDisconnected(nodes, edges),
  };
};

/**
 * Keeps only the connected component containing the primary root. Traversal is undirected
 * so converging paths (several symptoms feeding one decision) survive.
 */
const pruneDisconnected = (
  nodes: Map<string, DecisionNodeView>,
  edges: DecisionEdgeView[]
): { nodes: DecisionNodeView[]; edges: DecisionEdgeView[] } => {
  const targets = new Set(edges.map((edge) => edge.target_node_id));
  const roots = [...nodes.keys()].filter((nodeId) => !targets.has(nodeId));
  if (roots.length <= 1) {
    return { nodes: [...nodes.values()], edges };
  }

  const symptomRoots = roots.filter((nodeId) => nodes.get(nodeId)?.node_type === 'symptom');
  const root = symptomRoots.length > 0 ? symptomRoots[0] : [...roots].sort()[0];

  const adjacency = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    const neighbours = adjacency.get(from) ?? new Set<string>();
    neighbours.add(to);
    adjacency.set(from, neighbours);
  };
  for (const edge of edges) {
    link(edge.source_node_id, edge.target_node_id);
    link(edge.target_node_id, edge.source_node_id);
  }

  const connected = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const nodeId = queue.pop()!;
    if (connected.has(nodeId)) {
      continue;
    }
    connected.add(nodeId);
    for (const neighbour of adjacency.get(nodeId) ?? []) {
      if (!connected.has(neighbour)) {
        queue.push(neighbour);
      }
    }
  }

  return {
    nodes: [...nodes.values()].filter((node) => connected.has(node.node_id)),
    edges: edges.filter(
      (edge) => connected.has(edge.source_node_id) && connected.has(edge.target_node_id)
    ),
  };
};

/** Attaches `<node_id>: <description>` entries onto their evidence nodes, in place. */
export const applyEvidenceMetadata = (tree: DecisionTreeView, entries: string[]): void => {
  if (entries.length === 0) {
    return;
  }
  const nodesById = new Map(tree.nodes.map((node) => [node.node_id, node]));
  for (const entry of entries) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const nodeId = entry.slice(0, separator).trim();
    const description = entry.slice(separator + 1).trim();
    const node = nodesById.get(nodeId);
    if (node && description) {
      node.node_metadata = { description };
    }
  }
};
