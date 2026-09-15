/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { validateShortText } from '@kbn/nightshift-decision-trees';
import type {
  LearningRecord,
  SystemLearningCategory,
  ToolLearningCategory,
} from '@kbn/nightshift-decision-trees';
import type { CortexEntityType } from '../../common/cortex';
import { LEARNING_SLUG_PREFIX, isLearningSlug } from '../../common/decision_trees';
import { createCortexPageStore, slugFromCortexId } from '../cortex/page_store';
import type { CortexPageStore } from '../cortex/page_store';

/**
 * Each learning kind lands in the Cortex bucket that matches what it is about, so the wiki stays
 * browsable: system facts are topics, tool behaviour is a query note, remediations are runbooks.
 */
const ENTITY_TYPE_BY_KIND = {
  system: 'topic',
  tool: 'query',
  remediation: 'runbook',
} as const satisfies Record<LearningRecord['kind'], CortexEntityType>;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Slug for a learning slot. Recording the same category (and connector) again replaces the
 * previous entry rather than accumulating near-duplicates, which is the single-slot behaviour
 * the tool descriptions promise the model.
 */
export const learningSlug = (record: {
  kind: LearningRecord['kind'];
  category?: string;
  connectorName?: string;
}): string => {
  const parts = [LEARNING_SLUG_PREFIX.replace(/-$/, ''), record.kind];
  if (record.category) {
    parts.push(slugify(record.category));
  }
  if (record.connectorName) {
    parts.push(slugify(record.connectorName));
  }
  return parts.join('-');
};

const titleFor = (record: {
  kind: LearningRecord['kind'];
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
    kind: LearningRecord['kind'];
    content: string;
    category?: SystemLearningCategory | ToolLearningCategory;
    connectorName?: string;
  }) => Promise<LearningRecord>;
  /** Active learnings, for the turn prompt's retention section. */
  list: () => Promise<LearningRecord[]>;
}

const parseSlug = (slug: string): { kind?: LearningRecord['kind']; rest: string[] } => {
  const [, kind, ...rest] = slug.split('-');
  const known = kind === 'system' || kind === 'tool' || kind === 'remediation' ? kind : undefined;
  return { kind: known, rest };
};

export const createLearningStore = ({
  esClient,
  logger,
  pageStore,
}: {
  esClient?: ElasticsearchClient;
  logger: Logger;
  pageStore?: CortexPageStore;
}): LearningStore => {
  const store =
    pageStore ?? createCortexPageStore({ esClient: esClient as ElasticsearchClient, logger });

  return {
    record: async ({ kind, content, category, connectorName }) => {
      const label =
        kind === 'system' ? 'System learning' : kind === 'tool' ? 'Tool learning' : 'Remediation';
      const validated = validateShortText(content, label);
      if (!validated) {
        throw new Error(`${label} must not be empty`);
      }

      const slug = learningSlug({ kind, category, connectorName });
      const keywords = [
        'nightshift-reinforcement',
        `learning:${kind}`,
        ...(category ? [`${kind}_learning:${category}`] : []),
        ...(connectorName ? [`connector:${connectorName}`] : []),
      ];

      await store.upsert({
        entityType: ENTITY_TYPE_BY_KIND[kind],
        slug,
        title: titleFor({ kind, category, connectorName }),
        description: keywords.join(', '),
        content: validated,
        status: 'tentative',
      });
      logger.debug(`Recorded ${kind} learning ${slug}`);

      return {
        kind,
        content: validated,
        keywords,
        ...(category ? { category } : {}),
        ...(connectorName ? { connector_name: connectorName } : {}),
      };
    },

    list: async () => {
      const { pages } = await store.list();
      const learningPages = pages.filter((page) =>
        isLearningSlug(slugFromCortexId(page.id, page.entity_type))
      );

      const records = await Promise.all(
        learningPages.map(async (summary) => {
          const page = await store.get(summary.id);
          if (!page) {
            return undefined;
          }
          const { kind, rest } = parseSlug(page.slug);
          if (!kind) {
            return undefined;
          }
          const record: LearningRecord = {
            kind,
            content: page.content,
            keywords: (page.description ?? '').split(', ').filter(Boolean),
            ...(kind === 'system' && rest[0]
              ? { category: rest[0] as SystemLearningCategory }
              : {}),
            ...(kind === 'tool' && rest.length >= 2
              ? {
                  category: rest[0] as ToolLearningCategory,
                  connector_name: rest.slice(1).join('-'),
                }
              : {}),
          };
          return record;
        })
      );

      return records.filter((record): record is LearningRecord => record !== undefined);
    },
  };
};
