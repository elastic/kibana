/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '@kbn/core/server';
import type { SanitizedRule } from '@kbn/alerting-types';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  AttachmentLink,
  AttachmentDocument,
  AttachmentType,
  AttachmentData,
  DashboardSOAttributes,
  SloSOAttributes,
} from './types';
import { ATTACHMENT_ID, ATTACHMENT_TYPE, ATTACHMENT_UUID, STREAM_NAMES } from './storage_settings';

export function getAttachmentLinkUuid(attachment: AttachmentLink): string {
  return objectHash({
    [ATTACHMENT_ID]: attachment.id,
    [ATTACHMENT_TYPE]: attachment.type,
  });
}

export const getAttachmentDocument = (attachment: {
  id: string;
  type: AttachmentType;
  streamNames: string[];
  uuid: string;
}): AttachmentDocument => {
  return {
    [ATTACHMENT_ID]: attachment.id,
    [ATTACHMENT_TYPE]: attachment.type,
    [ATTACHMENT_UUID]: attachment.uuid,
    [STREAM_NAMES]: attachment.streamNames,
  };
};

const processDashboardResults = (
  savedObjects: Array<SavedObject<DashboardSOAttributes>>
): AttachmentData[] => {
  return savedObjects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => ({
      id: savedObject.id,
      redirectId: savedObject.id,
      type: 'dashboard',
      title: savedObject.attributes.title,
      tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
      description: savedObject.attributes.description,
      createdAt: savedObject.created_at,
      updatedAt: savedObject.updated_at,
    }));
};

const processSloResults = (savedObjects: Array<SavedObject<SloSOAttributes>>): AttachmentData[] => {
  return savedObjects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => ({
      id: savedObject.id,
      redirectId: savedObject.attributes.id,
      type: 'slo',
      title: savedObject.attributes.name,
      tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
      description: savedObject.attributes.description,
      createdAt: savedObject.created_at,
      updatedAt: savedObject.updated_at,
    }));
};

export const processRuleResults = (rules: SanitizedRule[]): AttachmentData[] => {
  return rules.map((rule) => ({
    id: rule.id,
    redirectId: rule.id,
    type: 'rule',
    title: rule.name,
    tags: rule.tags,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }));
};

/**
 * Fetches saved objects by IDs for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export const getSoByIds = async ({
  soClient,
  attachmentType,
  ids,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: Extract<AttachmentType, 'dashboard' | 'slo'>;
  ids: string[];
}): Promise<AttachmentData[]> => {
  if (attachmentType === 'dashboard') {
    const result = await soClient.bulkGet<DashboardSOAttributes>(
      ids.map((id) => ({ id, type: attachmentType }))
    );
    return processDashboardResults(result.saved_objects);
  } else if (attachmentType === 'slo') {
    const result = await soClient.bulkGet<SloSOAttributes>(
      ids.map((id) => ({ id, type: attachmentType }))
    );
    return processSloResults(result.saved_objects);
  } else {
    throw new Error(`Unsupported attachment type: ${attachmentType}`);
  }
};

/**
 * Fetches rules by IDs using the rules client.
 */
export const getRulesByIds = async ({
  rulesClient,
  ids,
}: {
  rulesClient: RulesClient;
  ids: string[];
}): Promise<AttachmentData[]> => {
  try {
    const { rules } = await rulesClient.bulkGetRules({ ids });
    return processRuleResults(rules);
  } catch (error) {
    if (error.message === 'No rules found for bulk get') {
      return [];
    }
    throw error;
  }
};

// Different saved object types use different field names for their title
const searchFieldsByType: Record<Extract<AttachmentType, 'dashboard' | 'slo'>, string[]> = {
  dashboard: ['title'],
  slo: ['name'],
};

const MAX_PAGES = 10;
const PAGE_SIZE = 100;

/**
 * Paginates through results, filtering out excluded IDs, until we have enough items.
 * This is needed because neither the saved objects client nor the rules client
 * support filtering by ID in the query.
 */
async function paginateWithExclusion<T extends SavedObject<unknown> | SanitizedRule>({
  limit,
  excludeIds,
  fetchPage,
}: {
  limit: number;
  excludeIds?: string[];
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>;
}): Promise<T[]> {
  const excludeIdsSet = new Set(excludeIds ?? []);
  const results: T[] = [];
  let page = 1;
  let hasMore = true;

  while (results.length < limit && hasMore && page <= MAX_PAGES) {
    const { items, total } = await fetchPage(page);

    const filteredItems = items.filter((item) => !excludeIdsSet.has(item.id));
    results.push(...filteredItems);

    const fetchedSoFar = page * PAGE_SIZE;
    hasMore = fetchedSoFar < total;
    page++;
  }

  return results.slice(0, limit);
}

/**
 * Searches for suggested saved objects for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export const getSuggestedSo = async ({
  soClient,
  attachmentType,
  query,
  tags,
  limit,
  excludeIds,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: Extract<AttachmentType, 'dashboard' | 'slo'>;
  query: string;
  tags?: string[];
  limit: number;
  excludeIds?: string[];
}): Promise<AttachmentData[]> => {
  const searchOptions: SavedObjectsFindOptions = {
    type: attachmentType,
    search: query ? `${query}*` : undefined,
    searchFields: searchFieldsByType[attachmentType],
    perPage: PAGE_SIZE,
    ...(tags
      ? {
          hasReferenceOperator: 'OR',
          hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
        }
      : {}),
  };

  if (attachmentType === 'dashboard') {
    const dashboardResults = await paginateWithExclusion({
      limit,
      excludeIds,
      fetchPage: async (page) => {
        const result = await soClient.find<DashboardSOAttributes>({ ...searchOptions, page });
        return { items: result.saved_objects, total: result.total };
      },
    });
    return processDashboardResults(dashboardResults);
  } else {
    const sloResults = await paginateWithExclusion({
      limit,
      excludeIds,
      fetchPage: async (page) => {
        const result = await soClient.find<SloSOAttributes>({ ...searchOptions, page });
        return { items: result.saved_objects, total: result.total };
      },
    });
    return processSloResults(sloResults);
  }
};

/**
 * Searches for suggested rules.
 */
export const getSuggestedRules = async ({
  rulesClient,
  query,
  tags,
  limit,
  excludeIds,
}: {
  rulesClient: RulesClient;
  query: string;
  tags?: string[];
  limit: number;
  excludeIds?: string[];
}): Promise<AttachmentData[]> => {
  const tagsFilter =
    tags && tags.length > 0
      ? tags.map((tag) => `alert.attributes.tags:"${tag}"`).join(' or ')
      : undefined;

  const results = await paginateWithExclusion({
    limit,
    excludeIds,
    fetchPage: async (page) => {
      const { data, total } = await rulesClient.find({
        options: {
          search: query ? `${query}*` : undefined,
          page,
          perPage: PAGE_SIZE,
          ...(tagsFilter ? { filter: tagsFilter } : {}),
        },
      });
      return { items: data, total };
    },
  });

  return processRuleResults(results);
};
