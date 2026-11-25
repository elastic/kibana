/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  canonicalizeSlug,
  createWikiPageStore,
  isVersionConflict,
  toWikiPageId,
  type WikiPage,
  type WikiPageWrite,
} from '@kbn/agent-knowledge-wiki';
import { MAX_PAGE_CONTENT_LENGTH } from '../../common';
import type { RecalledPage } from '../../common';
import { addEntryToContent } from './add_entry_to_content';
import { WikiError } from './wiki_error';

/** Another writer can change the page between the read and the write; each retry re-reads it. */
const MAX_WRITE_ATTEMPTS = 3;

/** A page that only receives entries records a human decision each time, so it is never tentative. */
const ENTRY_PAGE_STATUS = 'established';

export interface PageStore {
  get: (pageType: string, key: string) => Promise<RecalledPage | undefined>;
  addEntry: (params: {
    pageType: string;
    key: string;
    title: string;
    entriesHeading: string;
    entry: { id: string; content: string };
    provenance: { workflowExecutionId: string; conversationId?: string };
  }) => Promise<{ outcome: 'recorded' | 'already_recorded'; entryCount: number }>;
}

const toRecalledPage = (page: WikiPage): RecalledPage => ({
  key: page.slug,
  title: page.title,
  content: page.content,
  entry_count: page.entry_ids?.length ?? 0,
  updated_at: page.updated_at,
});

/**
 * Pages of one space in one index, kept by the shared wiki page store. The client is the caller's:
 * the store never falls back to another identity, so Elasticsearch decides what the caller may read
 * and write.
 */
export const createPageStore = ({
  esClient,
  logger,
  index,
  pageTypes,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  index: string;
  /** Every page type of the wiki, so a page of a sibling type is not mistaken for a foreign document. */
  pageTypes: readonly string[];
  spaceId: string;
  signal?: AbortSignal;
}): PageStore => {
  const store = createWikiPageStore({
    esClient,
    logger,
    spaceId,
    signal,
    index,
    entityTypes: pageTypes,
  });

  // The shared store folds a slug into its canonical form, so a key that is not already in that
  // form would land on another key's page.
  const toPageId = (pageType: string, key: string): string => {
    if (canonicalizeSlug(pageType, key) !== key) {
      throw new WikiError('invalid_key', `Key "${key}" is not a valid page key`);
    }
    return toWikiPageId(pageType, key);
  };

  return {
    async get(pageType, key) {
      const page = await store.get(toPageId(pageType, key));
      return page && page.entity_type === pageType ? toRecalledPage(page) : undefined;
    },

    async addEntry({ pageType, key, title, entriesHeading, entry, provenance }) {
      const id = toPageId(pageType, key);
      for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
        const stored = await store.get(id);
        if (stored && stored.entity_type !== pageType) {
          throw new WikiError(
            'invalid_document',
            `Document for page "${key}" in "${index}" is a page of another type`
          );
        }
        const entryIds = stored?.entry_ids ?? [];
        if (entryIds.includes(entry.id)) {
          return { outcome: 'already_recorded', entryCount: entryIds.length };
        }

        const content = addEntryToContent(stored?.content ?? '', entriesHeading, entry.content);
        if (content.length > MAX_PAGE_CONTENT_LENGTH) {
          throw new WikiError(
            'page_too_large',
            `Page "${key}" would grow to ${content.length} characters, past the ${MAX_PAGE_CONTENT_LENGTH} limit`
          );
        }

        const write: WikiPageWrite = {
          entityType: pageType,
          slug: key,
          title,
          content,
          status: ENTRY_PAGE_STATUS,
          entryIds: [...entryIds, entry.id],
          workflowExecutionId: provenance.workflowExecutionId,
          conversationId: provenance.conversationId,
        };

        if (stored) {
          try {
            await store.upsert({ ...write, version: stored.version });
            return { outcome: 'recorded', entryCount: entryIds.length + 1 };
          } catch (error) {
            if (!isVersionConflict(error)) {
              throw error;
            }
          }
        } else {
          if (await store.create(write)) {
            return { outcome: 'recorded', entryCount: entryIds.length + 1 };
          }
          // The create lost to a document already stored under the id. When it is still not
          // readable as a page, retrying cannot succeed.
          if (!(await store.get(id))) {
            throw new WikiError(
              'invalid_document',
              `Document for page "${key}" in "${index}" is not a wiki page`
            );
          }
        }
      }
      throw new WikiError(
        'version_conflict',
        `Page "${key}" kept changing under ${MAX_WRITE_ATTEMPTS} write attempts`
      );
    },
  };
};
