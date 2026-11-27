/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

type CrawlFieldType = 'integer' | 'keyword' | 'date';

// Added to indices that don't have them to support purging pages
const CRAWL_FIELDS: Record<string, { type: CrawlFieldType }> = {
  depth: { type: 'integer' },
  crawl_id: { type: 'keyword' },
  crawl_scope: { type: 'keyword' },
  crawled_at: { type: 'date' },
  url_host: { type: 'keyword' },
  url_path: { type: 'keyword' },
};

const COMPATIBLE_TYPES: Record<CrawlFieldType, string[]> = {
  integer: ['integer', 'long', 'short', 'byte'],
  keyword: ['keyword'],
  date: ['date', 'date_nanos'],
};

const CRAWL_INDEX_PROPERTIES: Record<string, estypes.MappingProperty> = {
  url: { type: 'keyword' },
  title: { type: 'text' },
  description: { type: 'text' },
  content: { type: 'text', copy_to: 'content_semantic' },
  content_semantic: { type: 'semantic_text' },
  url_path_dir1: { type: 'keyword' },
  url_path_dir2: { type: 'keyword' },
  url_path_dir3: { type: 'keyword' },
  ...CRAWL_FIELDS,
};

export class IncompatibleCrawlIndexError extends Error {}

export const readCrawlIndexMappings = async (
  esClient: ElasticsearchClient,
  indexName: string
): Promise<Record<string, estypes.MappingTypeMapping> | undefined> => {
  try {
    const indices = await esClient.indices.getMapping({ index: indexName });
    return Object.fromEntries(
      Object.entries(indices).map(([concreteName, { mappings }]) => [concreteName, mappings])
    );
  } catch (error) {
    if (error?.statusCode === 404) {
      return undefined;
    }
    throw error;
  }
};

export const createCrawlIndex = async (
  esClient: ElasticsearchClient,
  indexName: string
): Promise<void> => {
  await esClient.indices.create({
    index: indexName,
    mappings: { properties: CRAWL_INDEX_PROPERTIES },
  });
};

/**
 * Adds required fields to existing indices. Throws `IncompatibleCrawlIndexError` on mapping conflicts.
 */
export const addCrawlFields = async (
  esClient: ElasticsearchClient,
  mappingsByIndex: Record<string, estypes.MappingTypeMapping>
): Promise<void> => {
  const missingByIndex: Record<string, Record<string, estypes.MappingProperty>> = {};
  for (const [indexName, { properties = {} }] of Object.entries(mappingsByIndex)) {
    for (const [field, property] of Object.entries(CRAWL_FIELDS)) {
      const existing = properties[field];
      if (!existing) {
        missingByIndex[indexName] = { ...missingByIndex[indexName], [field]: property };
      } else if (!COMPATIBLE_TYPES[property.type].includes(existing.type ?? 'object')) {
        throw new IncompatibleCrawlIndexError(
          `Index ${indexName} maps ${field} as ${
            existing.type ?? 'object'
          }, and a crawl needs it to be ${property.type}`
        );
      }
    }
  }
  // One request per index: behind an alias, each index can be missing different fields
  await Promise.all(
    Object.entries(missingByIndex).map(([indexName, properties]) =>
      esClient.indices.putMapping({ index: indexName, properties })
    )
  );
};

export const getIndexPrivileges = async (
  esClient: ElasticsearchClient,
  indexNames: string[],
  privilege: 'read' | 'write'
): Promise<Record<string, boolean>> => {
  if (indexNames.length === 0) {
    return {};
  }
  const { index } = await esClient.security.hasPrivileges({
    index: [{ names: indexNames, privileges: [privilege] }],
  });
  return Object.fromEntries(
    indexNames.map((indexName) => [indexName, index[indexName]?.[privilege] === true])
  );
};
