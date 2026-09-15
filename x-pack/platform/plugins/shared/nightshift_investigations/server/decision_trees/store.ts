/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  extractMermaid,
  symptomSlugFromTreeId,
  symptomTreeId,
} from '@kbn/nightshift-decision-trees';
import type { CortexPageStatus } from '../../common/cortex';
import {
  DECISION_TREE_ENTITY_TYPE,
  DECISION_TREE_SLUG_PREFIX,
  isDecisionTreeSlug,
} from '../../common/decision_trees';
import { canonicalizeSlug, createCortexPageStore, slugFromCortexId } from '../cortex/page_store';
import type { CortexPageStore } from '../cortex/page_store';

export const cortexSlugForSymptom = (symptom: string): string =>
  `${DECISION_TREE_SLUG_PREFIX}${symptomSlugFromTreeId(symptom)}`;

export const symptomFromCortexSlug = (cortexSlug: string): string =>
  isDecisionTreeSlug(cortexSlug) ? cortexSlug.slice(DECISION_TREE_SLUG_PREFIX.length) : cortexSlug;

export interface DecisionTreeSummary {
  tree_id: string;
  symptom: string;
  title: string;
  status: CortexPageStatus;
  corroborations: number;
  updated_at: string;
}

export interface StoredDecisionTree extends DecisionTreeSummary {
  /** The full markdown file as the agent last wrote it. */
  markdown: string;
  /** The Mermaid block pulled out of {@link markdown}, fences included. */
  mermaid: string;
}

export interface DecisionTreeStore {
  list: () => Promise<DecisionTreeSummary[]>;
  get: (treeId: string) => Promise<StoredDecisionTree | undefined>;
  upsert: (tree: {
    treeId: string;
    markdown: string;
    title?: string;
    description?: string;
    reinforced?: boolean;
  }) => Promise<StoredDecisionTree>;
  /** Bumps the corroboration count, recording that this turn traversed the tree. */
  markVisited: (treeId: string) => Promise<void>;
  archive: (treeId: string) => Promise<void>;
}

/** Turns `checkout-high-latency` into `Checkout High Latency` for the wiki page title. */
const titleFromSymptom = (symptom: string): string =>
  symptom
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const cortexIdForTree = (treeId: string): string =>
  `cortex_${DECISION_TREE_ENTITY_TYPE}_${canonicalizeSlug(
    DECISION_TREE_ENTITY_TYPE,
    cortexSlugForSymptom(treeId)
  )}`;

/**
 * A stored tree whose Mermaid can no longer be extracted is still returned, with an empty
 * `mermaid`. The guardrails treat a missing original as "no baseline to compare against"
 * rather than blocking the write, which is the right call: a corrupt stored page should not
 * stop the agent from replacing it.
 */
const safeExtractMermaid = (markdown: string): string => {
  try {
    return extractMermaid(markdown);
  } catch {
    return '';
  }
};

export const createDecisionTreeStore = ({
  esClient,
  logger,
  pageStore,
}: {
  esClient?: ElasticsearchClient;
  logger: Logger;
  pageStore?: CortexPageStore;
}): DecisionTreeStore => {
  const store =
    pageStore ??
    createCortexPageStore({
      esClient: esClient as ElasticsearchClient,
      logger,
    });

  const toSummary = (page: {
    id: string;
    title: string;
    status: CortexPageStatus;
    corroborations: number;
    updated_at: string;
  }): DecisionTreeSummary => {
    const symptom = symptomFromCortexSlug(slugFromCortexId(page.id, DECISION_TREE_ENTITY_TYPE));
    return {
      tree_id: symptomTreeId(symptom),
      symptom,
      title: page.title,
      status: page.status,
      corroborations: page.corroborations,
      updated_at: page.updated_at,
    };
  };

  return {
    list: async () => {
      const { pages } = await store.list({ entityType: DECISION_TREE_ENTITY_TYPE });
      return pages
        .filter((page) => isDecisionTreeSlug(slugFromCortexId(page.id, page.entity_type)))
        .map(toSummary);
    },

    get: async (treeId) => {
      const page = await store.get(cortexIdForTree(treeId));
      if (!page) {
        return undefined;
      }
      return {
        ...toSummary(page),
        markdown: page.content,
        mermaid: safeExtractMermaid(page.content),
      };
    },

    upsert: async ({ treeId, markdown, title, description, reinforced = false }) => {
      const symptom = symptomSlugFromTreeId(treeId);
      const existing = await store.get(cortexIdForTree(treeId));
      const page = await store.upsert({
        entityType: DECISION_TREE_ENTITY_TYPE,
        slug: cortexSlugForSymptom(symptom),
        title: title ?? existing?.title ?? titleFromSymptom(symptom),
        description: description ?? existing?.description,
        content: markdown,
        // A human-confirmed root cause is what promotes a tree from tentative to established;
        // an ordinary turn leaves the status where it was.
        status: reinforced ? 'established' : existing?.status ?? 'tentative',
        corroborations: existing?.corroborations,
      });
      logger.debug(`Persisted decision tree ${symptomTreeId(symptom)}`);
      return {
        ...toSummary(page),
        markdown: page.content,
        mermaid: safeExtractMermaid(page.content),
      };
    },

    markVisited: async (treeId) => {
      await store.corroborate(cortexIdForTree(treeId));
    },

    archive: async (treeId) => {
      await store.archive(cortexIdForTree(treeId));
    },
  };
};
