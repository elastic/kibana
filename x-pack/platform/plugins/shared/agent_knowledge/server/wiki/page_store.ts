/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_PAGE_CONTENT_LENGTH } from '../../common';
import type { RecalledPage } from '../../common';
import { addEntryToContent } from './add_entry_to_content';
import { WikiError } from './wiki_error';

const WIKI_TAG = 'wiki';
/** Another writer can change the page between the read and the write; each retry re-reads it. */
const MAX_WRITE_ATTEMPTS = 3;

/**
 * The stored page. `attributes` is mapped as `flattened` in AI indices, so its leaves need no
 * mapping of their own. `type` is namespaced so readers of a shared index that filter on their
 * own document types never match a page.
 */
interface PageSource {
  '@timestamp': string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  attributes: {
    page_type: string;
    key: string;
    space_id: string;
    entry_ids: string[];
    workflow_execution_id?: string;
    conversation_id?: string;
  };
}

interface StoredPage {
  source: PageSource;
  seqNo: number;
  primaryTerm: number;
}

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

const getStatusCode = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined;

const toDocumentType = (pageType: string): string => `${WIKI_TAG}.${pageType}`;

const toRecalledPage = ({ source }: StoredPage): RecalledPage => ({
  key: source.attributes.key,
  title: source.title,
  content: source.content,
  entry_count: source.attributes.entry_ids.length,
  updated_at: source['@timestamp'],
});

/**
 * Pages of one space in one index. The client is the caller's: the store never falls back to
 * another identity, so Elasticsearch decides what the caller may read and write.
 */
export const createPageStore = ({
  esClient,
  index,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  spaceId: string;
  signal?: AbortSignal;
}): PageStore => {
  const toDocumentId = (pageType: string, key: string): string => `${spaceId}:${pageType}:${key}`;

  const read = async (pageType: string, key: string): Promise<StoredPage | undefined> => {
    const id = toDocumentId(pageType, key);
    let response;
    try {
      response = await esClient.get<PageSource>({ index, id }, { signal });
    } catch (error) {
      if (getStatusCode(error) === 404) {
        return undefined;
      }
      throw error;
    }
    const { _source: source, _seq_no: seqNo, _primary_term: primaryTerm } = response;
    if (!response.found || source === undefined) {
      return undefined;
    }
    const { attributes } = source;
    if (
      source.type !== toDocumentType(pageType) ||
      attributes?.space_id !== spaceId ||
      attributes.key !== key ||
      !Array.isArray(attributes.entry_ids) ||
      typeof source.content !== 'string' ||
      seqNo === undefined ||
      primaryTerm === undefined
    ) {
      throw new WikiError('invalid_document', `Document "${id}" in "${index}" is not a wiki page`);
    }
    return { source, seqNo, primaryTerm };
  };

  return {
    async get(pageType, key) {
      const stored = await read(pageType, key);
      return stored ? toRecalledPage(stored) : undefined;
    },

    async addEntry({ pageType, key, title, entriesHeading, entry, provenance }) {
      const id = toDocumentId(pageType, key);
      for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
        const stored = await read(pageType, key);
        const entryIds = stored?.source.attributes.entry_ids ?? [];
        if (entryIds.includes(entry.id)) {
          return { outcome: 'already_recorded', entryCount: entryIds.length };
        }

        const content = addEntryToContent(
          stored?.source.content ?? '',
          entriesHeading,
          entry.content
        );
        if (content.length > MAX_PAGE_CONTENT_LENGTH) {
          throw new WikiError(
            'page_too_large',
            `Page "${key}" would grow to ${content.length} characters, past the ${MAX_PAGE_CONTENT_LENGTH} limit`
          );
        }

        const document: PageSource = {
          '@timestamp': new Date().toISOString(),
          type: toDocumentType(pageType),
          title,
          content,
          tags: [WIKI_TAG, pageType],
          attributes: {
            page_type: pageType,
            key,
            space_id: spaceId,
            entry_ids: [...entryIds, entry.id],
            workflow_execution_id: provenance.workflowExecutionId,
            ...(provenance.conversationId ? { conversation_id: provenance.conversationId } : {}),
          },
        };

        try {
          if (stored) {
            await esClient.index(
              {
                index,
                id,
                document,
                if_seq_no: stored.seqNo,
                if_primary_term: stored.primaryTerm,
                refresh: 'wait_for',
              },
              { signal }
            );
          } else {
            await esClient.create({ index, id, document, refresh: 'wait_for' }, { signal });
          }
          return { outcome: 'recorded', entryCount: document.attributes.entry_ids.length };
        } catch (error) {
          if (getStatusCode(error) !== 409) {
            throw error;
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
