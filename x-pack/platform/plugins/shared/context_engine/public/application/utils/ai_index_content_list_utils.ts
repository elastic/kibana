/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListItem } from '@kbn/content-list-provider';
import { defineContentListFilter } from '@kbn/content-list-provider-client';
import type { TableListViewFindItemsFn } from '@kbn/content-list-provider-client';
import { i18n } from '@kbn/i18n';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { AI_INDEX_OWNER_LABEL, AI_INDEX_TYPE_LABEL } from '../components/ai_index_list/labels';

/** Fills four rows of the three-column card grid. */
export const AI_INDICES_PER_PAGE = 12;

export const AI_INDEX_TYPE_FILTER_ID = 'aiIndexType';
export const AI_INDEX_OWNER_FILTER_ID = 'aiIndexOwner';

export interface AiIndexUserContent extends UserContentCommonSchema {
  aiIndex: AiIndexHttpItem;
}

type AiIndexListItem = ContentListItem<{ aiIndex: AiIndexHttpItem }>;

const isAiIndexListItem = (item: ContentListItem): item is AiIndexListItem => 'aiIndex' in item;

export const AI_INDEX_LIST_LABELS = {
  entity: i18n.translate('xpack.contextEngine.landing.entity', {
    defaultMessage: 'AI Index',
  }),
  entityPlural: i18n.translate('xpack.contextEngine.landing.entityPlural', {
    defaultMessage: 'AI Indexes',
  }),
  searchPlaceholder: i18n.translate('xpack.contextEngine.landing.searchPlaceholder', {
    defaultMessage: 'Search AI Indexes',
  }),
};

// We need this because for now, we only do client-side search and ContentList forwards EUI-parsed search text.
const normalizeSearchQuery = (searchQuery: string): string =>
  searchQuery.trim().replace(/\\-/g, '-').replace(/ -/g, '-');

const matchesQuery = (aiIndex: AiIndexHttpItem, query: string): boolean => {
  const haystack = [aiIndex.id, aiIndex.description, aiIndex.dest.value];
  return haystack.some((field) => field?.toLowerCase().includes(query));
};

export const toAiIndexUserContent = (aiIndex: AiIndexHttpItem): AiIndexUserContent => ({
  id: aiIndex.id,
  type: aiIndex.dest.type,
  managed: aiIndex.managed,
  updatedAt: aiIndex.date_modified,
  createdAt: aiIndex.date_created,
  references: [],
  attributes: {
    title: aiIndex.id,
    description: aiIndex.description,
  },
  aiIndex,
});

export const toAiIndexHttpItem = (item: ContentListItem): AiIndexHttpItem => {
  if (!isAiIndexListItem(item)) {
    throw new Error('Content list item is missing aiIndex');
  }

  return item.aiIndex;
};

export const filterAiIndicesBySearch = (
  aiIndices: AiIndexHttpItem[],
  searchQuery: string
): AiIndexHttpItem[] => {
  const normalizedQuery = normalizeSearchQuery(searchQuery).toLowerCase();

  if (normalizedQuery === '') {
    return aiIndices;
  }

  return aiIndices.filter((aiIndex) => matchesQuery(aiIndex, normalizedQuery));
};

export const createFindAiIndices =
  (aiIndices: AiIndexHttpItem[]): TableListViewFindItemsFn =>
  async (searchQuery) => {
    const hits = filterAiIndicesBySearch(aiIndices, searchQuery).map(toAiIndexUserContent);

    return {
      total: hits.length,
      hits,
    };
  };

export const aiIndexTypeFilter = defineContentListFilter({
  id: AI_INDEX_TYPE_FILTER_ID,
  title: i18n.translate('xpack.contextEngine.landing.typeFilterLabel', {
    defaultMessage: 'Type',
  }),
  getItemValue: (item) => item.type,
  options: [
    { value: 'index', label: AI_INDEX_TYPE_LABEL.index },
    { value: 'data_stream', label: AI_INDEX_TYPE_LABEL.data_stream },
  ],
});

export const aiIndexOwnerFilter = defineContentListFilter({
  id: AI_INDEX_OWNER_FILTER_ID,
  title: i18n.translate('xpack.contextEngine.landing.ownerFilterLabel', {
    defaultMessage: 'Owner',
  }),
  getItemValue: (item) => (item.managed ? 'managed' : 'user'),
  options: [
    { value: 'managed', label: AI_INDEX_OWNER_LABEL.managed },
    { value: 'user', label: AI_INDEX_OWNER_LABEL.user },
  ],
});
