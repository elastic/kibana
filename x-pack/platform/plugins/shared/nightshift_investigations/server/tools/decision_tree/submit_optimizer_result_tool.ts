/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import {
  DECISION_TREE_DIRECTORY,
  DecisionTreeValidationError,
  applyEvidenceMetadata,
  enforceMinimumGraph,
  enforceNodePreservation,
  enforceParsedSizeFloor,
  enforceRawSizeFloor,
  extractMermaid,
  isSymptomTreeId,
  parseMermaidDecisionTree,
  parseStoredDecisionTree,
  symptomFilePath,
  symptomSlugError,
  symptomSlugFromTreeId,
  validateEvidenceMetadata,
} from '@kbn/nightshift-decision-trees';
import type { DecisionTreeView, LearningRecord } from '@kbn/nightshift-decision-trees';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import type { DecisionTreeDetail, DecisionTreeStore } from '../../decision_trees/store';
import {
  getConversationId,
  getScopedConversationId,
  resolveAbsolutePath,
} from '../sandbox_bash/tool_utils';

export const DECISION_TREE_SUBMIT_TOOL_ID = 'submit_optimizer_result';

const MAX_TREE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SUBMISSIONS = 10;

const submissionSchema = z.object({
  tree_id: z
    .string()
    .max(256)
    .describe(
      'Identifier of the tree, formatted as symptom:<slug>. For an existing tree, use symptom:<symptom> with the symptom from the decision-trees/monitors.md table; for a new tree use the symptom slug you chose.'
    ),
  file_path: z
    .string()
    .max(4096)
    .describe(`Path to the edited markdown file under ${DECISION_TREE_DIRECTORY}/.`),
  evidence_gatherer_metadata: z
    .array(z.string().max(4096))
    .max(200)
    .default([])
    .describe(
      "One entry per evidence_gatherer node, formatted '<node_id>: <description>'. Describe the toolset used, what data it gathers and from which sources, preserving exact query entities such as index patterns, field names, metric names, service names and filters."
    ),
});

const submitSchema = z.object({
  symptom_trees: z
    .array(submissionSchema)
    .max(MAX_SUBMISSIONS)
    .default([])
    .describe(
      'The decision-tree files you edited or created this turn. Submit an empty list when the existing tree already covers this investigation.'
    ),
  summary: z
    .string()
    .max(4096)
    .default('')
    .describe('One or two sentences describing what changed in the tree, or why nothing changed.'),
});

interface SubmissionOutcome {
  tree_id: string;
  file_path: string;
  status: 'persisted' | 'rejected';
  detail: string;
}

/**
 * Terminal tool for the reinforcement agent.
 *
 * Reads each submitted file back out of the sandbox rather than trusting an inline copy, then runs
 * every guardrail before persisting. A rejected tree is reported back with the reason so the agent
 * can repair it, while the trees that passed are still written.
 */
export const createSubmitOptimizerResultTool = ({
  getSandboxStart,
  getStore,
  getSpaceId,
  getUsername,
  peekLearnings,
  drainLearnings,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  getStore: (esClient: ElasticsearchClient, request: KibanaRequest) => DecisionTreeStore;
  getSpaceId: (request: KibanaRequest) => string;
  /** Resolves the authenticated user, recorded as the version author. */
  getUsername?: (request: KibanaRequest) => string | undefined;
  /** Reads the learnings this conversation recorded this turn without clearing them. */
  peekLearnings?: (conversationId: string) => LearningRecord[];
  /** Takes and clears the learnings this conversation recorded this turn. */
  drainLearnings?: (conversationId: string) => LearningRecord[];
  logger: Logger;
}): BuiltinToolDefinition<typeof submitSchema> => ({
  id: DECISION_TREE_SUBMIT_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Finalize this reinforcement turn. Submits the decision-tree files you edited or created so they are validated and persisted. Call this exactly once, at the end of the turn, even when you made no changes — in that case pass an empty symptom_trees list.',
  tags: ['decision-tree'],
  schema: submitSchema,
  annotations: {
    title: 'Submit Optimizer Result',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (params, context) => {
    const conversationId = getScopedConversationId(context, getSpaceId);
    const rawConversationId = getConversationId(context);
    if (!conversationId || !rawConversationId) {
      return {
        results: [
          { type: ToolResultType.error, data: { message: 'No conversation context available.' } },
        ],
      };
    }

    const sandboxStart = getSandboxStart();
    if (!sandboxStart) {
      return {
        results: [{ type: ToolResultType.error, data: { message: 'Sandbox is not available.' } }],
      };
    }

    let session: SandboxSession;
    try {
      session = sandboxStart.getSession(context.request, rawConversationId);
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: err instanceof Error ? err.message : 'Sandbox is not available.' },
          },
        ],
      };
    }

    const store = getStore(context.esClient.asCurrentUser, context.request);
    const author = getUsername?.(context.request) || 'system';
    // Peek until every submission is accepted. Draining first would drop this turn's learnings
    // when the agent has to fix a rejected file and call submit again.
    const turnLearnings = peekLearnings?.(conversationId) ?? [];
    const outcomes: SubmissionOutcome[] = [];

    if (params.symptom_trees.length === 0) {
      const attached = await persistLearningsWithoutEdits({
        store,
        author,
        summary: params.summary,
        learnings: turnLearnings,
      });
      drainLearnings?.(conversationId);
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              text:
                attached.length === 0
                  ? 'No decision-tree changes submitted. Turn complete.'
                  : `No structural edits. Attached learnings to ${
                      attached.length
                    } tree(s):\n${attached.map((treeId) => `- ${treeId}`).join('\n')}`,
              summary: params.summary,
            },
          },
        ],
      };
    }

    for (const submission of params.symptom_trees) {
      try {
        outcomes.push(
          await persistSubmission({
            submission,
            session,
            store,
            author,
            summary: params.summary,
            learnings: turnLearnings.filter(
              (learning) =>
                learning.tree_id !== undefined &&
                symptomSlugFromTreeId(learning.tree_id) ===
                  symptomSlugFromTreeId(submission.tree_id)
            ),
          })
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        logger.warn(`Rejected decision-tree submission ${submission.tree_id}: ${detail}`);
        outcomes.push({
          tree_id: submission.tree_id,
          file_path: submission.file_path,
          status: 'rejected',
          detail,
        });
      }
    }

    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
    const persisted = outcomes.filter((outcome) => outcome.status === 'persisted');

    if (rejected.length === 0) {
      drainLearnings?.(conversationId);
    }

    if (rejected.length > 0) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: [
                `${rejected.length} decision tree(s) were rejected and NOT saved. Fix the file and call this tool again.`,
                ...rejected.map((outcome) => `- ${outcome.tree_id}: ${outcome.detail}`),
                ...(persisted.length > 0
                  ? [`${persisted.length} other tree(s) were saved successfully.`]
                  : []),
              ].join('\n'),
            },
          },
        ],
      };
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            text:
              persisted.length === 0
                ? 'No decision-tree changes submitted. Turn complete.'
                : `Persisted ${persisted.length} decision tree(s):\n${persisted
                    .map((outcome) => `- ${outcome.tree_id} (${outcome.detail})`)
                    .join('\n')}`,
            summary: params.summary,
          },
        },
      ],
    };
  },
});

const persistSubmission = async ({
  submission,
  session,
  store,
  author,
  summary,
  learnings,
}: {
  submission: z.infer<typeof submissionSchema>;
  session: SandboxSession;
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
}): Promise<SubmissionOutcome> => {
  const { tree_id: treeId, file_path: filePath, evidence_gatherer_metadata: metadata } = submission;

  if (!isSymptomTreeId(treeId)) {
    throw new DecisionTreeValidationError(
      treeId,
      `tree_id must be formatted symptom:<slug>, got "${treeId}"`
    );
  }

  const slug = symptomSlugFromTreeId(treeId);
  const slugError = symptomSlugError(slug);
  if (slugError) {
    throw new DecisionTreeValidationError(treeId, slugError);
  }

  // Containment check: the agent may only write inside the decision-tree directory, and the file
  // name has to match the tree it claims to be, or a tree could be persisted from any file.
  const expectedPath = resolveAbsolutePath(symptomFilePath(slug));
  const resolvedPath = resolveAbsolutePath(filePath);
  if (resolvedPath !== expectedPath) {
    throw new DecisionTreeValidationError(
      treeId,
      `file_path for ${treeId} must be ${symptomFilePath(slug)}, got "${filePath}"`
    );
  }

  const [readResult] = await session.readFiles([
    { path: resolvedPath, maxReadBytes: MAX_TREE_FILE_BYTES },
  ]);
  if (!readResult?.success) {
    throw new DecisionTreeValidationError(treeId, `Could not read submitted file ${filePath}`);
  }

  const markdown = readResult.content.toString('utf8');
  const newMermaid = extractMermaid(markdown);
  const newTree = parseMermaidDecisionTree(newMermaid, treeId);
  if (newTree.nodes.length === 0) {
    throw new DecisionTreeValidationError(
      treeId,
      `No decision-tree nodes could be parsed from ${filePath}. Check the node shapes.`
    );
  }

  validateEvidenceMetadata(treeId, metadata);
  applyEvidenceMetadata(newTree, metadata);
  enforceMinimumGraph(newTree);

  const existing = await store.get(treeId);
  const originalMermaid = existing?.mermaid ?? '';
  enforceRawSizeFloor({ treeId, originalMermaid, newMermaid });
  enforceParsedSizeFloor({ treeId, originalMermaid, newTree });
  enforceNodePreservation({
    treeId,
    originalMermaid,
    newNodeIds: new Set(newTree.nodes.map((node) => node.node_id)),
  });

  // Initial trees mark the path they walked with ✅ even without a confirmed root cause.
  // Only a newly taken edge on an existing tree is a causal reinforcement.
  const reinforced = hasNewlyTakenEdges(existing, newTree);
  await store.commit({
    treeId,
    markdown,
    tree: newTree,
    reinforced,
    author,
    summary,
    learnings,
    evidenceGathererMetadata: metadata,
  });

  return {
    tree_id: treeId,
    file_path: filePath,
    status: 'persisted',
    detail: `${newTree.nodes.length} nodes, ${newTree.edges.length} edges${
      reinforced ? ', causal path marked' : ''
    }`,
  };
};

const takenEdgeKey = (edge: DecisionTreeView['edges'][number]): string =>
  `${edge.source_node_id}\u0000${edge.target_node_id}\u0000${edge.condition}`;

/** True when this edit introduces a taken edge the previous version did not have. */
const hasNewlyTakenEdges = (
  existing: DecisionTreeDetail | undefined,
  newTree: DecisionTreeView
): boolean => {
  if (!existing) {
    return false;
  }
  const original = parseStoredDecisionTree(
    existing.mermaid,
    existing.tree_id,
    existing.evidence_gatherer_metadata
  );
  const originalTaken = new Set(original.edges.filter((edge) => edge.is_taken).map(takenEdgeKey));
  return newTree.edges.some((edge) => edge.is_taken && !originalTaken.has(takenEdgeKey(edge)));
};

/** Commits this turn's learnings onto existing trees when the agent made no file edits. */
const persistLearningsWithoutEdits = async ({
  store,
  author,
  summary,
  learnings,
}: {
  store: DecisionTreeStore;
  author: string;
  summary: string;
  learnings: LearningRecord[];
}): Promise<string[]> => {
  const byTree = new Map<string, LearningRecord[]>();
  for (const learning of learnings) {
    if (!learning.tree_id) {
      continue;
    }
    const existing = byTree.get(learning.tree_id) ?? [];
    existing.push(learning);
    byTree.set(learning.tree_id, existing);
  }

  const attached: string[] = [];
  for (const [treeId, treeLearnings] of byTree) {
    const existing = await store.get(treeId);
    if (!existing) {
      continue;
    }
    const tree = parseStoredDecisionTree(
      existing.mermaid,
      treeId,
      existing.evidence_gatherer_metadata
    );
    await store.commit({
      treeId,
      markdown: existing.markdown,
      tree,
      reinforced: false,
      author,
      summary,
      learnings: treeLearnings,
      evidenceGathererMetadata: existing.evidence_gatherer_metadata,
    });
    attached.push(treeId);
  }
  return attached;
};
