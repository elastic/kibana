/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  normalizeSymptomSlug,
  symptomSlugFromTreeId,
  validateShortText,
} from '@kbn/nightshift-decision-trees';
import type {
  LearningKind,
  LearningRecord,
  SystemLearningCategory,
  ToolLearningCategory,
} from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_AI_INDEX_DEST, DECISION_TREE_TAG } from '../../common/decision_trees';

const MAX_LEARNINGS = 200;
const SPACE_ID_FIELD = 'attributes.space_id';

/** Backing document for one learning slot in the decision-tree index. */
interface DecisionTreeLearningSource extends LearningRecord {
  '@timestamp': string;
  type: 'decision_tree_learning';
  title: string;
  tags: string[];
  attributes?: { space_id?: string; tree_id?: string };
}

/**
 * Document id for a learning slot. Recording the same tree/kind (and category, and connector) again
 * writes the same id, so the previous entry is replaced rather than a near-duplicate accumulated —
 * the single-slot behaviour the tool descriptions promise the model.
 */
const learningDocId = (
  spaceId: string,
  record: {
    kind: LearningKind;
    treeId: string;
    category?: string;
    connectorName?: string;
  }
): string => {
  const parts = [
    'dtree_learning',
    normalizeSymptomSlug(symptomSlugFromTreeId(record.treeId)),
    record.kind,
  ];
  if (record.category) {
    parts.push(normalizeSymptomSlug(record.category));
  }
  if (record.connectorName) {
    parts.push(normalizeSymptomSlug(record.connectorName));
  }
  return `${spaceId}:${parts.join('_')}`;
};

const titleFor = (record: {
  kind: LearningKind;
  category?: string;
  connectorName?: string;
}): string => {
  if (record.kind === 'remediation') {
    return 'Remediation';
  }
  if (record.kind === 'system') {
    return `System learning: ${record.category}`;
  }
  return `Tool learning: ${record.connectorName} ${record.category}`;
};

export interface LearningStore {
  /** Replaces the slot for this tree/kind/category/connector and returns the stored record. */
  record: (input: {
    kind: LearningKind;
    treeId: string;
    content: string;
    category?: SystemLearningCategory | ToolLearningCategory;
    connectorName?: string;
  }) => Promise<LearningRecord>;
  /** Active learnings in this space, for the turn prompt's retention section. */
  list: () => Promise<LearningRecord[]>;
}

const toRecord = (source: DecisionTreeLearningSource): LearningRecord => ({
  kind: source.kind,
  content: source.content,
  keywords: source.keywords ?? [],
  ...(source.tree_id ? { tree_id: source.tree_id } : {}),
  ...(source.category ? { category: source.category } : {}),
  ...(source.connector_name ? { connector_name: source.connector_name } : {}),
});

export const createLearningStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): LearningStore => {
  return {
    record: async ({ kind, treeId, content, category, connectorName }) => {
      const label =
        kind === 'system' ? 'System learning' : kind === 'tool' ? 'Tool learning' : 'Remediation';
      const validated = validateShortText(content, label);
      if (!validated) {
        throw new Error(`${label} must not be empty`);
      }

      const keywords = [
        'nightshift-reinforcement',
        `learning:${kind}`,
        ...(category ? [`${kind}_learning:${category}`] : []),
        ...(connectorName ? [`connector:${connectorName}`] : []),
      ];

      const record: LearningRecord = {
        kind,
        tree_id: treeId,
        content: validated,
        keywords,
        ...(category ? { category } : {}),
        ...(connectorName ? { connector_name: connectorName } : {}),
      };

      const document: DecisionTreeLearningSource = {
        '@timestamp': new Date().toISOString(),
        type: 'decision_tree_learning',
        title: titleFor({ kind, category, connectorName }),
        tags: ['nightshift', DECISION_TREE_TAG, 'learning'],
        attributes: { space_id: spaceId, tree_id: treeId },
        ...record,
      };

      const id = learningDocId(spaceId, { kind, treeId, category, connectorName });
      await esClient.index(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          id,
          document,
          refresh: 'wait_for',
        },
        { signal }
      );
      logger.debug(`Recorded ${kind} learning ${id}`);

      return record;
    },

    list: async () => {
      const response = await esClient.search<DecisionTreeLearningSource>(
        {
          index: DECISION_TREE_AI_INDEX_DEST,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_LEARNINGS,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                { term: { type: 'decision_tree_learning' } },
                { term: { [SPACE_ID_FIELD]: spaceId } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) => (hit._source ? [toRecord(hit._source)] : []));
    },
  };
};
