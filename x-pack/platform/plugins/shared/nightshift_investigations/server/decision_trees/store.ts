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
const SPACE_ID_FIELD = 'attributes.space_id';

/**
 * Structured fields live under `attributes` so they inherit the AI-index template's flattened
 * mapping, the same way Cortex stores `status` / `slug` / `space_id`. The backing index is
 * auto-created on first write from that template; we never call `indices.create`.
 */
interface DecisionTreeAttributes {
  tree_id?: string;
  symptom?: string;
  version?: number | string;
  status?: string;
  author?: string;
  summary?: string;
  reinforced?: boolean | string;
  node_count?: number | string;
  edge_count?: number | string;
  space_id?: string;
}

/** The head document, one per tree, holding the current markdown and merged learnings. */
interface DecisionTreeHeadSource {
  '@timestamp': string;
  type: 'decision_tree';
  title: string;
  content: string;
  tags: string[];
  attributes?: DecisionTreeAttributes;
  learnings: LearningRecord[];
}

/** An append-only version document, one per reinforcement turn. */
interface DecisionTreeVersionSource {
  '@timestamp': string;
  type: 'decision_tree_version';
  title: string;
  content: string;
  tags: string[];
  attributes?: DecisionTreeAttributes;
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

const headDocId = (spaceId: string, symptom: string): string => `${spaceId}:dtree_${symptom}`;

const versionDocId = (spaceId: string, symptom: string, version: number): string =>
  `${spaceId}:dtree_${symptom}_v${version}`;

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

/** Single-slot key: recording the same tree/kind/category/connector replaces the previous learning. */
const learningKey = (learning: LearningRecord): string =>
  `${learning.tree_id ?? ''}\u0000${learning.kind}\u0000${learning.category ?? ''}\u0000${
    learning.connector_name ?? ''
  }`;

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

/** Flattened attributes may come back as strings; coerce the same way Cortex does. */
const toCount = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }
  return fallback;
};

const toStatus = (value: string | undefined): DecisionTreeStatus =>
  value === 'established' || value === 'archived' || value === 'tentative' ? value : 'tentative';

const toBool = (value: boolean | string | undefined): boolean => value === true || value === 'true';

const headToSummary = (source: DecisionTreeHeadSource): DecisionTreeSummary => ({
  tree_id: source.attributes?.tree_id ?? '',
  symptom: source.attributes?.symptom ?? '',
  title: source.title,
  status: toStatus(source.attributes?.status),
  version: toCount(source.attributes?.version),
  node_count: toCount(source.attributes?.node_count),
  edge_count: toCount(source.attributes?.edge_count),
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
  version: toCount(source.attributes?.version),
  author: source.attributes?.author ?? '',
  summary: source.attributes?.summary ?? '',
  reinforced: toBool(source.attributes?.reinforced),
  node_count: toCount(source.attributes?.node_count),
  edge_count: toCount(source.attributes?.edge_count),
  learning_count: source.learnings.length,
  created_at: source['@timestamp'],
});

const versionToDetail = (source: DecisionTreeVersionSource): DecisionTreeVersionDetail => ({
  ...versionToSummary(source),
  tree_id: source.attributes?.tree_id ?? '',
  markdown: source.content,
  mermaid: safeExtractMermaid(source.content),
  learnings: source.learnings,
});

export const createDecisionTreeStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  /** Aborts in-flight Elasticsearch requests when the calling step times out. */
  signal?: AbortSignal;
}): DecisionTreeStore => {
  const getHead = async (symptom: string): Promise<DecisionTreeHeadSource | undefined> => {
    try {
      const response = await esClient.get<DecisionTreeHeadSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: headDocId(spaceId, symptom),
        },
        { signal }
      );
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
      const response = await esClient.search<DecisionTreeHeadSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_TREES,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { term: { type: 'decision_tree' } },
                { term: { tags: DECISION_TREE_TAG } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) => (hit._source ? [headToSummary(hit._source)] : []));
    },

    get: async (treeId) => {
      const source = await getHead(symptomSlugFromTreeId(treeId));
      return source ? headToDetail(source) : undefined;
    },

    commit: async ({ treeId, markdown, tree, reinforced, author, summary, learnings }) => {
      const symptom = symptomSlugFromTreeId(treeId);
      const existing = await getHead(symptom);
      const nextVersion = toCount(existing?.attributes?.version) + 1;
      // A human-confirmed root cause is what promotes a tree from tentative to established; an
      // ordinary turn leaves the status where it was.
      const status: DecisionTreeStatus = reinforced
        ? 'established'
        : toStatus(existing?.attributes?.status);
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
        content: markdown,
        tags,
        attributes: {
          tree_id: fullTreeId,
          symptom,
          version: nextVersion,
          author,
          summary,
          reinforced,
          node_count: nodeCount,
          edge_count: edgeCount,
          space_id: spaceId,
        },
        learnings,
      };

      const headDoc: DecisionTreeHeadSource = {
        '@timestamp': now,
        type: 'decision_tree',
        title,
        content: markdown,
        tags,
        attributes: {
          tree_id: fullTreeId,
          symptom,
          version: nextVersion,
          status,
          node_count: nodeCount,
          edge_count: edgeCount,
          space_id: spaceId,
        },
        learnings: mergeLearnings(existing?.learnings ?? [], learnings),
      };

      await esClient.index(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: versionDocId(spaceId, symptom, nextVersion),
          document: versionDoc,
        },
        { signal }
      );
      await esClient.index(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: headDocId(spaceId, symptom),
          document: headDoc,
          refresh: 'wait_for',
        },
        { signal }
      );

      logger.debug(`Committed decision tree ${fullTreeId} v${nextVersion}`);
      return headToDetail(headDoc);
    },

    listVersions: async (treeId) => {
      const response = await esClient.search<DecisionTreeVersionSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_VERSIONS,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { term: { type: 'decision_tree_version' } },
                { term: { 'attributes.tree_id': symptomTreeId(symptomSlugFromTreeId(treeId)) } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) =>
        hit._source ? [versionToSummary(hit._source)] : []
      );
    },

    getVersion: async (treeId, version) => {
      try {
        const response = await esClient.get<DecisionTreeVersionSource>(
          {
            index: DECISION_TREE_AI_INDEX_DEST,
            id: versionDocId(spaceId, symptomSlugFromTreeId(treeId), version),
          },
          { signal }
        );
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
      await esClient.index(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id: headDocId(spaceId, symptom),
          document: {
            ...existing,
            '@timestamp': new Date().toISOString(),
            attributes: { ...existing.attributes, status: 'archived', space_id: spaceId },
          },
          refresh: 'wait_for',
        },
        { signal }
      );
    },
  };
};
