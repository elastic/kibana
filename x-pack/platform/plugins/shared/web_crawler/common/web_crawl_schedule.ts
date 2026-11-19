/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import type { WebCrawlScheduleRequest } from './types';
import { WEB_CRAWL_STEP_ID } from './web_crawl_step';

/** Marks the workflows created from the crawl management page, so the page can list them. */
export const WEB_CRAWL_WORKFLOW_TAG = 'web-crawl';
export const WORKFLOWS_API_VERSION = '2023-10-31';
export const WORKFLOWS_PATH = '/api/workflows';
export const WORKFLOW_PATH = '/api/workflows/workflow';

/** Builds a workflow that crawls a site on a fixed interval, and on demand through its manual trigger. */
export const buildWebCrawlWorkflowYaml = ({
  url,
  maxDepth,
  maxDocuments,
  includePaths = [],
  excludePaths = [],
  indexName,
  seedUrls = [],
  sitemapUrls = [],
  every,
  unit,
}: WebCrawlScheduleRequest): string =>
  stringifyWorkflowDefinition({
    version: '1',
    name: `Web crawl: ${url}`,
    description: `Crawls ${url} every ${every}${unit}. Created from the web crawls page.`,
    enabled: true,
    tags: [WEB_CRAWL_WORKFLOW_TAG],
    triggers: [{ type: 'scheduled', with: { every: `${every}${unit}` } }, { type: 'manual' }],
    steps: [
      {
        name: 'crawl',
        type: WEB_CRAWL_STEP_ID,
        with: {
          url,
          ...(maxDepth === undefined ? {} : { max_depth: maxDepth }),
          ...(maxDocuments === undefined ? {} : { max_documents: maxDocuments }),
          ...(includePaths.length === 0 ? {} : { include_paths: includePaths }),
          ...(excludePaths.length === 0 ? {} : { exclude_paths: excludePaths }),
          ...(indexName === undefined ? {} : { index_name: indexName }),
          ...(seedUrls.length === 0 ? {} : { seed_urls: seedUrls }),
          ...(sitemapUrls.length === 0 ? {} : { sitemap_urls: sitemapUrls }),
        },
      },
    ],
  });
