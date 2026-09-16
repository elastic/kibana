/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  extractMermaid,
  symptomSlugFromTreeId,
  symptomTreeId,
  type DecisionTreeView,
  type LearningRecord,
} from '@kbn/nightshift-decision-trees';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_TAG,
  type DecisionTreeDetail,
  type DecisionTreeStatus,
  type DecisionTreeSummary,
  type DecisionTreeVersionDetail,
  type DecisionTreeVersionSummary,
} from '../../common/decision_trees';

export type {
  DecisionTreeDetail,
  DecisionTreeStatus,
  DecisionTreeSummary,
  DecisionTreeVersionDetail,
  DecisionTreeVersionSummary,
} from '../../common/decision_trees';

const MAX_TREES = 500;
const MAX_VERSIONS = 500;

/** The head document, one per tree, holding the current markdown and merged learnings. */
interface DecisionTreeHeadSource {
  '@timestamp': string;
  type: 'decision_tree';
  title: string;
  content: string;
  tags: string[];
  tree_id: string;
  symptom: string;
  version: number;
  status: DecisionTreeStatus;
  node_count: number;
  edge_count: number;
  learnings: LearningRecord[];
}

/** An append-only version document, one per reinforcement turn. */
interface DecisionTreeVersionSource {
  '@timestamp': string;
  type: 'decision_tree_version';
  title: string;
  tags: string[];
  tree_id: string;
  symptom: string;
  version: number;
  snapshot: string;
  author: string;
  summary: string;
  reinforced: boolean;
  node_count: number;
  edge_count: number;
  learnings: LearningRecord[];
}

export interface DecisionTreeStore {
  list: () => Promise<DecisionTreeSummary[]>;
  get: (treeId: string) => Promise<DecisionTreeDetail | undefined>;
  /** Writes a new version of the tree and updates its head. Returns the updated head. */
  commit: (input: {
    treeId: string;
    markdown: string;
    /** Already parsed and validated by the caller, so counts stay consistent with the markdown. */
    tree: DecisionTreeView;
    reinforced: boolean;
    author: string;
    summary: string;
    /** Learnings recorded during this turn; merged single-slot into the head. */
    learnings: LearningRecord[];
  }) => Promise<DecisionTreeDetail>;
  listVersions: (treeId: string) => Promise<DecisionTreeVersionSummary[]>;
  getVersion: (treeId: string, version: number) => Promise<DecisionTreeVersionDetail | undefined>;
  archive: (treeId: string) => Promise<void>;
}

/** Turns `checkout-high-latency` into `Checkout High Latency` for the tree title. */
const titleFromSymptom = (symptom: string): string =>
  symptom
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const headDocId = (symptom: string): string => `dtree_${symptom}`;

const versionDocId = (symptom: string, version: number): string => `dtree_${symptom}_v${version}`;

/**
 * A stored tree whose Mermaid can no longer be extracted is still returned, with an empty
 * `mermaid`. A corrupt stored page should not stop the agent from replacing it, and the guardrails
 * treat a missing original as "no baseline to compare against".
 */
const safeExtractMermaid = (markdown: string): string => {
  try {
    return extractMermaid(markdown);
  } catch {
    return '';
  }
};

/** Single-slot key: recording the same kind/category/connector replaces the previous learning. */
const learningKey = (learning: LearningRecord): string =>
  `${learning.kind}\u0000${learning.category ?? ''}\u0000${learning.connector_name ?? ''}`;

/** Merges this turn's learnings into the tree's existing set, newest winning per slot. */
const mergeLearnings = (
  existing: LearningRecord[],
  incoming: LearningRecord[]
): LearningRecord[] => {
  const bySlot = new Map<string, LearningRecord>();
  for (const learning of existing) {
    bySlot.set(learningKey(learning), learning);
  }
  for (const learning of incoming) {
    bySlot.set(learningKey(learning), learning);
  }
  return [...bySlot.values()];
};

const headToSummary = (source: DecisionTreeHeadSource): DecisionTreeSummary => ({
  tree_id: source.tree_id,
  symptom: source.symptom,
  title: source.title,
  status: source.status,
  version: source.version,
  node_count: source.node_count,
  edge_count: source.edge_count,
  learning_count: source.learnings.length,
  updated_at: source['@timestamp'],
});

const headToDetail = (source: DecisionTreeHeadSource): DecisionTreeDetail => ({
  ...headToSummary(source),
  markdown: source.content,
  mermaid: safeExtractMermaid(source.content),
  learnings: source.learnings,
});

const versionToSummary = (source: DecisionTreeVersionSource): DecisionTreeVersionSummary => ({
  version: source.version,
  author: source.author,
  summary: source.summary,
  reinforced: source.reinforced,
  node_count: source.node_count,
  edge_count: source.edge_count,
  learning_count: source.learnings.length,
  created_at: source['@timestamp'],
});

const versionToDetail = (source: DecisionTreeVersionSource): DecisionTreeVersionDetail => ({
  ...versionToSummary(source),
  tree_id: source.tree_id,
  markdown: source.snapshot,
  mermaid: safeExtractMermaid(source.snapshot),
  learnings: source.learnings,
});

/** Cache the ensure-index round trip per client so the store does not re-check on every write. */
const ensured = new WeakMap<ElasticsearchClient, Promise<void>>();

/**
 * Creates the backing index with explicit mappings when it does not yet exist.
 *
 * Elasticsearch would otherwise auto-create it from the `ai-index-idx` template on first write,
 * dynamically mapping `snapshot` with a `.keyword` sub-field that a large tree would overflow, and
 * failing to give `version` a numeric type to sort on. `dynamic: false` keeps any unexpected field
 * in `_source` without indexing it.
 */
export const ensureDecisionTreeIndex = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const inFlight = ensured.get(esClient);
  if (inFlight) {
    return inFlight;
  }

  const create = (async () => {
    try {
      if (await esClient.indices.exists({ index: DECISION_TREE_AI_INDEX_DEST })) {
        return;
      }
      await esClient.indices.create({
        index: DECISION_TREE_AI_INDEX_DEST,
        mappings: {
          dynamic: false,
          properties: {
            tree_id: { type: 'keyword' },
            symptom: { type: 'keyword' },
            version: { type: 'long' },
            status: { type: 'keyword' },
            author: { type: 'keyword' },
            summary: { type: 'text' },
            reinforced: { type: 'boolean' },
            node_count: { type: 'long' },
            edge_count: { type: 'long' },
            // Version snapshots are display-only: never embedded, never searched.
            snapshot: { type: 'text', index: false },
            learnings: {
              type: 'object',
              properties: {
                kind: { type: 'keyword' },
                category: { type: 'keyword' },
                connector_name: { type: 'keyword' },
                content: { type: 'text', index: false },
                keywords: { type: 'keyword' },
              },
            },
          },
        },
      });
      logger.debug(`Created decision-tree index ${DECISION_TREE_AI_INDEX_DEST}`);
    } catch (error) {
      // A concurrent creator won the race; the index now exists, which is all we need.
      if (isResponseError(error) && error.statusCode === 400) {
        return;
      }
      // Do not cache a failure: a transient error must not permanently disable writes.
      ensured.delete(esClient);
      throw error;
    }
  })();

  ensured.set(esClient, create);
  return create;
};

export const createDecisionTreeStore = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): DecisionTreeStore => {
  const getHead = async (symptom: string): Promise<DecisionTreeHeadSource | undefined> => {
    try {
      const response = await esClient.get<DecisionTreeHeadSource>({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: headDocId(symptom),
      });
      return response.found ? response._source : undefined;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  };

  return {
    list: async () => {
      const response = await esClient.search<DecisionTreeHeadSource>({
        index: DECISION_TREE_AI_INDEX_DEST,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: MAX_TREES,
        track_total_hits: false,
        query: {
          bool: {
            filter: [{ term: { type: 'decision_tree' } }, { term: { tags: DECISION_TREE_TAG } }],
          },
        },
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      });

      return response.hits.hits.flatMap((hit) => (hit._source ? [headToSummary(hit._source)] : []));
    },

    get: async (treeId) => {
      const source = await getHead(symptomSlugFromTreeId(treeId));
      return source ? headToDetail(source) : undefined;
    },

    commit: async ({ treeId, markdown, tree, reinforced, author, summary, learnings }) => {
      await ensureDecisionTreeIndex(esClient, logger);

      const symptom = symptomSlugFromTreeId(treeId);
      const existing = await getHead(symptom);
      const nextVersion = (existing?.version ?? 0) + 1;
      // A human-confirmed root cause is what promotes a tree from tentative to established; an
      // ordinary turn leaves the status where it was.
      const status: DecisionTreeStatus = reinforced
        ? 'established'
        : existing?.status ?? 'tentative';
      const title = existing?.title ?? titleFromSymptom(symptom);
      const nodeCount = tree.nodes.length;
      const edgeCount = tree.edges.length;
      const now = new Date().toISOString();
      const fullTreeId = symptomTreeId(symptom);
      const tags = ['nightshift', DECISION_TREE_TAG];

      const versionDoc: DecisionTreeVersionSource = {
        '@timestamp': now,
        type: 'decision_tree_version',
        title: `${title} v${nextVersion}`,
        tags,
        tree_id: fullTreeId,
        symptom,
        version: nextVersion,
        snapshot: markdown,
        author,
        summary,
        reinforced,
        node_count: nodeCount,
        edge_count: edgeCount,
        learnings,
      };

      const headDoc: DecisionTreeHeadSource = {
        '@timestamp': now,
        type: 'decision_tree',
        title,
        content: markdown,
        tags,
        tree_id: fullTreeId,
        symptom,
        version: nextVersion,
        status,
        node_count: nodeCount,
        edge_count: edgeCount,
        learnings: mergeLearnings(existing?.learnings ?? [], learnings),
      };

      await esClient.index({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: versionDocId(symptom, nextVersion),
        document: versionDoc,
      });
      await esClient.index({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: headDocId(symptom),
        document: headDoc,
        refresh: 'wait_for',
      });

      logger.debug(`Committed decision tree ${fullTreeId} v${nextVersion}`);
      return headToDetail(headDoc);
    },

    listVersions: async (treeId) => {
      const response = await esClient.search<DecisionTreeVersionSource>({
        index: DECISION_TREE_AI_INDEX_DEST,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: MAX_VERSIONS,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              { term: { type: 'decision_tree_version' } },
              { term: { tree_id: symptomTreeId(symptomSlugFromTreeId(treeId)) } },
            ],
          },
        },
        sort: [{ version: { order: 'desc', unmapped_type: 'long' } }],
      });

      return response.hits.hits.flatMap((hit) =>
        hit._source ? [versionToSummary(hit._source)] : []
      );
    },

    getVersion: async (treeId, version) => {
      try {
        const response = await esClient.get<DecisionTreeVersionSource>({
          index: DECISION_TREE_AI_INDEX_DEST,
          id: versionDocId(symptomSlugFromTreeId(treeId), version),
        });
        return response.found && response._source ? versionToDetail(response._source) : undefined;
      } catch (error) {
        if (isResponseError(error) && error.statusCode === 404) {
          return undefined;
        }
        throw error;
      }
    },

    archive: async (treeId) => {
      const symptom = symptomSlugFromTreeId(treeId);
      const existing = await getHead(symptom);
      if (!existing) {
        return;
      }
      await esClient.index({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: headDocId(symptom),
        document: { ...existing, status: 'archived', '@timestamp': new Date().toISOString() },
        refresh: 'wait_for',
      });
    },
  };
};
