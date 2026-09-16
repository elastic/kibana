/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { validateShortText } from '@kbn/nightshift-decision-trees';
import type {
  LearningKind,
  LearningRecord,
  SystemLearningCategory,
  ToolLearningCategory,
} from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_AI_INDEX_DEST, DECISION_TREE_TAG } from '../../common/decision_trees';
import { ensureDecisionTreeIndex } from './store';

const MAX_LEARNINGS = 200;

/** Backing document for one learning slot in the decision-tree index. */
interface DecisionTreeLearningSource extends LearningRecord {
  '@timestamp': string;
  type: 'decision_tree_learning';
  title: string;
  tags: string[];
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Document id for a learning slot. Recording the same kind (and category, and connector) again
 * writes the same id, so the previous entry is replaced rather than a near-duplicate accumulated —
 * the single-slot behaviour the tool descriptions promise the model.
 */
const learningDocId = (record: {
  kind: LearningKind;
  category?: string;
  connectorName?: string;
}): string => {
  const parts = ['dtree_learning', record.kind];
  if (record.category) {
    parts.push(slugify(record.category));
  }
  if (record.connectorName) {
    parts.push(slugify(record.connectorName));
  }
  return parts.join('_');
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
  /** Replaces the slot for this kind/category/connector and returns the stored record. */
  record: (input: {
    kind: LearningKind;
    content: string;
    category?: SystemLearningCategory | ToolLearningCategory;
    connectorName?: string;
  }) => Promise<LearningRecord>;
  /** Active learnings, for the turn prompt's retention section. */
  list: () => Promise<LearningRecord[]>;
}

const toRecord = (source: DecisionTreeLearningSource): LearningRecord => ({
  kind: source.kind,
  content: source.content,
  keywords: source.keywords ?? [],
  ...(source.category ? { category: source.category } : {}),
  ...(source.connector_name ? { connector_name: source.connector_name } : {}),
});

export const createLearningStore = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): LearningStore => {
  return {
    record: async ({ kind, content, category, connectorName }) => {
      const label =
        kind === 'system' ? 'System learning' : kind === 'tool' ? 'Tool learning' : 'Remediation';
      const validated = validateShortText(content, label);
      if (!validated) {
        throw new Error(`${label} must not be empty`);
      }

      await ensureDecisionTreeIndex(esClient, logger);

      const keywords = [
        'nightshift-reinforcement',
        `learning:${kind}`,
        ...(category ? [`${kind}_learning:${category}`] : []),
        ...(connectorName ? [`connector:${connectorName}`] : []),
      ];

      const record: LearningRecord = {
        kind,
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
        ...record,
      };

      await esClient.index({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: learningDocId({ kind, category, connectorName }),
        document,
        refresh: 'wait_for',
      });
      logger.debug(`Recorded ${kind} learning ${learningDocId({ kind, category, connectorName })}`);

      return record;
    },

    list: async () => {
      const response = await esClient.search<DecisionTreeLearningSource>({
        index: DECISION_TREE_AI_INDEX_DEST,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: MAX_LEARNINGS,
        track_total_hits: false,
        query: { term: { type: 'decision_tree_learning' } },
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      });

      return response.hits.hits.flatMap((hit) => (hit._source ? [toRecord(hit._source)] : []));
    },
  };
};
