/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERTZERO_WIKI_AI_INDEX_DEST,
  ALERTZERO_WIKI_AI_INDEX_ID,
  NIGHTSHIFT_WIKI_AI_INDEX_DEST,
  NIGHTSHIFT_WIKI_AI_INDEX_ID,
  WIKI_EDIT_ACTIONS,
  WIKI_PAGE_STATUSES,
  type WikiEditAction,
  type WikiEntityType,
  type WikiPage,
  type WikiPageStatus,
  type WikiPageWrite,
  type WikiWriteProvenance,
} from '@kbn/agent-knowledge-common';
import { dropEmptySections } from '../wiki/drop_empty_sections';
import { lintWikiContent } from '../wiki/lint_content';
import {
  createWikiPageStore,
  toWikiPageId,
  type WikiPageStore,
} from '../wiki/page_store';
import type { TypePackRegistry } from './type_pack_registry';

const DEFAULT_DEST_BY_AI_INDEX: Record<string, string> = {
  [NIGHTSHIFT_WIKI_AI_INDEX_ID]: NIGHTSHIFT_WIKI_AI_INDEX_DEST,
  [ALERTZERO_WIKI_AI_INDEX_ID]: ALERTZERO_WIKI_AI_INDEX_DEST,
};

export interface WikiRecallParams {
  aiIndexId: string;
  spaceId: string;
  query?: string;
  entityTypes?: string[];
  slugs?: string[];
  status?: WikiPageStatus;
  limit?: number;
  signal?: AbortSignal;
}

export interface WikiRecallPage {
  id: string;
  title: string;
  entity_type: string;
  status: string;
  slug: string;
  content: string;
  description?: string;
  corroborations: number;
}

export interface WikiRecallResult {
  pages: WikiRecallPage[];
  recalled_ids: string[];
  context_markdown: string;
}

export interface WikiRecordEdit {
  action: WikiEditAction;
  entity_type: string;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  status?: WikiPageStatus;
}

export interface WikiRecordParams {
  aiIndexId: string;
  spaceId: string;
  edits: WikiRecordEdit[];
  provenance?: WikiWriteProvenance;
  signal?: AbortSignal;
}

export interface WikiRecordResult {
  applied: Array<{ action: string; id: string; entity_type: string; slug: string }>;
  skipped: Array<{ action: string; entity_type: string; slug: string; reason: string }>;
}

export interface WikiService {
  createStore: (params: {
    aiIndexId: string;
    spaceId: string;
    signal?: AbortSignal;
  }) => WikiPageStore;
  recall: (params: WikiRecallParams) => Promise<WikiRecallResult>;
  record: (params: WikiRecordParams) => Promise<WikiRecordResult>;
}

const resolveDest = (aiIndexId: string): string => {
  const dest = DEFAULT_DEST_BY_AI_INDEX[aiIndexId];
  if (dest === undefined) {
    // Managed AI indices use the `ai-index-idx-` prefix + registry id.
    return `ai-index-idx-${aiIndexId}`;
  }
  return dest;
};

const formatPageMarkdown = (page: WikiRecallPage): string => {
  const header = `### ${page.title} (\`${page.entity_type}/${page.slug}\`, ${page.status})`;
  const description = page.description ? `\n_${page.description}_\n` : '\n';
  return `${header}${description}\n${page.content.trim()}`;
};

const matchesQuery = (page: WikiPage, query: string | undefined): boolean => {
  if (query === undefined || query.trim().length === 0) {
    return true;
  }
  const haystack = `${page.title}\n${page.description ?? ''}\n${page.slug}\n${page.content}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .every((token) => haystack.includes(token));
};

export const createWikiService = ({
  esClient,
  logger,
  typePacks,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  typePacks: TypePackRegistry;
}): WikiService => {
  const createStore: WikiService['createStore'] = ({ aiIndexId, spaceId, signal }) => {
    const pack = typePacks.getByAiIndexId(aiIndexId);
    return createWikiPageStore({
      esClient,
      logger,
      spaceId,
      signal,
      destValue: resolveDest(aiIndexId),
      allowedEntityTypes: pack?.entityTypes,
    });
  };

  return {
    createStore,

    async recall({
      aiIndexId,
      spaceId,
      query,
      entityTypes,
      slugs,
      status,
      limit = 15,
      signal,
    }) {
      const store = createStore({ aiIndexId, spaceId, signal });
      const slugSet =
        slugs !== undefined && slugs.length > 0
          ? new Set(slugs.map((slug) => slug.trim().toLowerCase()))
          : undefined;

      const entityTypeFilter =
        entityTypes !== undefined && entityTypes.length > 0 ? entityTypes : [undefined];

      const collected: WikiPage[] = [];
      for (const entityType of entityTypeFilter) {
        const { pages: summaries } = await store.list({
          status,
          entityType: entityType as WikiEntityType | undefined,
        });
        for (const summary of summaries) {
          if (summary.status === 'archived' && status === undefined) {
            continue;
          }
          const page = await store.get(summary.id);
          if (!page) {
            continue;
          }
          if (slugSet !== undefined && !slugSet.has(page.slug.toLowerCase())) {
            continue;
          }
          if (!matchesQuery(page, query)) {
            continue;
          }
          collected.push(page);
          if (collected.length >= limit) {
            break;
          }
        }
        if (collected.length >= limit) {
          break;
        }
      }

      const pages: WikiRecallPage[] = collected.slice(0, limit).map((page) => ({
        id: page.id,
        title: page.title,
        entity_type: page.entity_type,
        status: page.status,
        slug: page.slug,
        content: page.content,
        ...(page.description !== undefined ? { description: page.description } : {}),
        corroborations: page.corroborations,
      }));

      const context_markdown =
        pages.length === 0
          ? '_No wiki pages recalled._'
          : `## Wiki context\n\n${pages.map(formatPageMarkdown).join('\n\n---\n\n')}`;

      return {
        pages,
        recalled_ids: pages.map((page) => page.id),
        context_markdown,
      };
    },

    async record({ aiIndexId, spaceId, edits, provenance, signal }) {
      const pack = typePacks.getByAiIndexId(aiIndexId);
      const allowedTypes = new Set(pack?.entityTypes ?? []);
      const store = createStore({ aiIndexId, spaceId, signal });
      const applied: WikiRecordResult['applied'] = [];
      const skipped: WikiRecordResult['skipped'] = [];

      for (const edit of edits.slice(0, 20)) {
        if (!(WIKI_EDIT_ACTIONS as readonly string[]).includes(edit.action)) {
          skipped.push({
            action: edit.action,
            entity_type: edit.entity_type,
            slug: edit.slug,
            reason: 'unknown_action',
          });
          continue;
        }
        if (allowedTypes.size > 0 && !allowedTypes.has(edit.entity_type)) {
          skipped.push({
            action: edit.action,
            entity_type: edit.entity_type,
            slug: edit.slug,
            reason: 'unknown_entity_type',
          });
          continue;
        }

        const id = toWikiPageId(edit.entity_type, edit.slug);

        if (edit.action === 'corroborate') {
          const page = await store.corroborate(id, provenance);
          if (!page) {
            skipped.push({
              action: edit.action,
              entity_type: edit.entity_type,
              slug: edit.slug,
              reason: 'page_not_found',
            });
            continue;
          }
          applied.push({
            action: edit.action,
            id: page.id,
            entity_type: page.entity_type,
            slug: page.slug,
          });
          continue;
        }

        if (edit.action === 'archive') {
          const page = await store.archive(id, undefined, provenance);
          if (!page) {
            skipped.push({
              action: edit.action,
              entity_type: edit.entity_type,
              slug: edit.slug,
              reason: 'page_not_found',
            });
            continue;
          }
          applied.push({
            action: edit.action,
            id: page.id,
            entity_type: page.entity_type,
            slug: page.slug,
          });
          continue;
        }

        // upsert
        if (edit.content === undefined || edit.content.trim().length === 0) {
          skipped.push({
            action: edit.action,
            entity_type: edit.entity_type,
            slug: edit.slug,
            reason: 'missing_content',
          });
          continue;
        }

        const cleaned = dropEmptySections(edit.content);
        const violations = lintWikiContent(cleaned).filter((v) => v.blocking);
        if (violations.length > 0) {
          skipped.push({
            action: edit.action,
            entity_type: edit.entity_type,
            slug: edit.slug,
            reason: `lint:${violations.map((v) => v.rule).join(',')}`,
          });
          continue;
        }

        const status: WikiPageStatus =
          edit.status !== undefined &&
          (WIKI_PAGE_STATUSES as readonly string[]).includes(edit.status)
            ? edit.status
            : 'tentative';

        const write: WikiPageWrite = {
          entityType: edit.entity_type as WikiEntityType,
          slug: edit.slug,
          title: edit.title,
          description: edit.description,
          content: cleaned,
          status,
          conversationId: provenance?.conversationId,
          roundId: provenance?.roundId,
          workflowExecutionId: provenance?.workflowExecutionId,
          ...(provenance?.conversationId
            ? { authoredBy: [provenance.conversationId] }
            : {}),
        };

        const page = await store.upsert(write);
        applied.push({
          action: edit.action,
          id: page.id,
          entity_type: page.entity_type,
          slug: page.slug,
        });
      }

      logger.debug(
        `Wiki record on ${aiIndexId}: applied=${applied.length} skipped=${skipped.length}`
      );
      return { applied, skipped };
    },
  };
};
