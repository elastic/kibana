/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DECISION_TREE_DIRECTORY, symptomFilePath } from '@kbn/nightshift-decision-trees';
import type { SandboxApiClient } from '../tools/sandbox_bash/grpc_client';
import type { DecisionTreeStore, DecisionTreeSummary } from './store';

export const DECISION_TREE_WORKSPACE_ROOT = `/workspace/${DECISION_TREE_DIRECTORY}`;

/** Absolute sandbox path for a tree, from its `symptom:<slug>` id. */
export const workspacePathForTree = (treeId: string): string =>
  `/workspace/${symptomFilePath(treeId)}`;

const renderIndex = (trees: DecisionTreeSummary[]): string => {
  const lines = [
    '# Decision trees',
    '',
    "Each file holds one symptom's investigation decision tree as a Mermaid flowchart.",
    'Open one with `nightshift_sandbox_view_file`, edit it with `nightshift_sandbox_str_replace`.',
    '',
  ];

  if (trees.length === 0) {
    lines.push("_No decision trees yet. Create one for this investigation's symptom._");
    lines.push('');
    return lines.join('\n');
  }

  for (const tree of trees) {
    lines.push(
      `- **${tree.title}** (${tree.status}, ${tree.corroborations}x) — ` +
        `\`${workspacePathForTree(tree.tree_id)}\` (tree_id \`${tree.tree_id}\`)`
    );
  }
  lines.push('');
  return lines.join('\n');
};

/**
 * Writes the stored decision trees into the agent's sandbox as plain markdown files, so the
 * model reads and edits them with its ordinary file tools.
 *
 * Returns the tree ids that were materialized; an empty result is what tells the turn-script
 * selector this is a create rather than a merge.
 */
export const materializeDecisionTrees = async ({
  apiClient,
  conversationId,
  store,
  logger,
}: {
  apiClient: SandboxApiClient;
  conversationId: string;
  store: DecisionTreeStore;
  logger: Logger;
}): Promise<DecisionTreeSummary[]> => {
  const allTrees = await store.list();
  // Archived means a tree was retired as wrong or obsolete, so re-hydrating it would invite the
  // agent to keep building on something we already decided not to trust.
  const trees = allTrees.filter((tree) => tree.status !== 'archived');

  const stored = (await Promise.all(trees.map(async (tree) => store.get(tree.tree_id)))).filter(
    (tree): tree is NonNullable<typeof tree> => tree !== undefined
  );

  await apiClient.mkdirs(conversationId, [DECISION_TREE_WORKSPACE_ROOT]);
  await apiClient.writeFiles(conversationId, [
    {
      path: `${DECISION_TREE_WORKSPACE_ROOT}/INDEX.md`,
      content: Buffer.from(renderIndex(trees), 'utf8'),
    },
    ...stored.map((tree) => ({
      path: workspacePathForTree(tree.tree_id),
      content: Buffer.from(tree.markdown, 'utf8'),
    })),
  ]);

  logger.info(
    `Materialized ${stored.length} decision tree(s) into sandbox conversation ${conversationId}`
  );
  return trees;
};
