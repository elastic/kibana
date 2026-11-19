/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { WEB_CRAWL_MAX_INDEX_NAME_LENGTH } from '../../common/constants';
import { getSiteKey } from './links';

const WEB_CRAWL_META_KEY = 'web_crawl';
const INDEX_NAME_PREFIX = 'web-crawl-';

/** Marks an index as created by a crawl, so a crawl never writes into an index it does not own. */
export interface WebCrawlIndexMeta {
  url: string;
}

export interface CrawlIndexState {
  exists: boolean;
  isCrawlIndex: boolean;
}

const URL_FIELD_PROPERTIES: Record<string, estypes.MappingProperty> = {
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
  ...URL_FIELD_PROPERTIES,
};

export const getCrawlIndexName = (url: string): string =>
  `${INDEX_NAME_PREFIX}${getSiteKey(url)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')}`;

/** Whether a crawl may be pointed at an index of this name. Stricter than Elasticsearch, on purpose. */
export const isValidCrawlIndexName = (indexName: string): boolean =>
  indexName.length <= WEB_CRAWL_MAX_INDEX_NAME_LENGTH && /^[a-z0-9][a-z0-9._-]*$/.test(indexName);

const isNotFoundError = (error: unknown): boolean =>
  (error as { statusCode?: number })?.statusCode === 404;

export const readCrawlIndexState = async (
  esClient: ElasticsearchClient,
  indexName: string
): Promise<CrawlIndexState> => {
  try {
    const mappings = await esClient.indices.getMapping({ index: indexName });
    const indexMeta = Object.values(mappings)[0]?.mappings._meta;
    return { exists: true, isCrawlIndex: indexMeta?.[WEB_CRAWL_META_KEY] !== undefined };
  } catch (error) {
    if (isNotFoundError(error)) {
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
  await esClient.indices.putMapping({ index: indexName, properties: URL_FIELD_PROPERTIES });
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
