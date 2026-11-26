/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

const WEB_CRAWL_META_KEY = 'web_crawl';

/** Marks an index as created by a crawl, so a crawl never writes into an index it does not own. */
export interface WebCrawlIndexMeta {
  url: string;
}

export interface CrawlIndexState {
  exists: boolean;
  isCrawlIndex: boolean;
}

// The fields added after the first crawl indices were created.
const LATER_PROPERTIES: Record<string, estypes.MappingProperty> = {
  crawl_scope: { type: 'keyword' },
  url_host: { type: 'keyword' },
  url_path: { type: 'keyword' },
  url_path_dir1: { type: 'keyword' },
  url_path_dir2: { type: 'keyword' },
  url_path_dir3: { type: 'keyword' },
};

// `content` is copied into `content_semantic`, so one field value is ingested for both full-text
// and semantic search. `content_semantic` uses the default `semantic_text` inference endpoint.
const CRAWL_INDEX_PROPERTIES: Record<string, estypes.MappingProperty> = {
  url: { type: 'keyword' },
  title: { type: 'text' },
  description: { type: 'text' },
  content: { type: 'text', copy_to: 'content_semantic' },
  content_semantic: { type: 'semantic_text' },
  depth: { type: 'integer' },
  crawl_id: { type: 'keyword' },
  crawled_at: { type: 'date' },
  ...LATER_PROPERTIES,
};

export const readCrawlIndexState = async (
  esClient: ElasticsearchClient,
  indexName: string
): Promise<CrawlIndexState> => {
  try {
    const mappings = await esClient.indices.getMapping({ index: indexName });
    // An alias or a data stream answers with the indices behind it, under their own names.
    const indexMeta = Object.hasOwn(mappings, indexName)
      ? mappings[indexName].mappings._meta
      : undefined;
    return { exists: true, isCrawlIndex: indexMeta?.[WEB_CRAWL_META_KEY] !== undefined };
  } catch (error) {
    if (error?.statusCode === 404) {
      return { exists: false, isCrawlIndex: false };
    }
    throw error;
  }
};

export const createCrawlIndex = async (
  esClient: ElasticsearchClient,
  indexName: string,
  meta: WebCrawlIndexMeta
): Promise<void> => {
  await esClient.indices.create({
    index: indexName,
    mappings: { _meta: { [WEB_CRAWL_META_KEY]: meta }, properties: CRAWL_INDEX_PROPERTIES },
  });
};

/** Adds the fields introduced after an index was created. Mappings only ever gain fields. */
export const updateCrawlIndexMappings = async (
  esClient: ElasticsearchClient,
  indexName: string
): Promise<void> => {
  await esClient.indices.putMapping({ index: indexName, properties: LATER_PROPERTIES });
};

/** Reports, for each index, whether the user holds `privilege` on it. Works for missing indices too. */
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
