/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
} from './constants';

export const WEB_CRAWL_STEP_ID = 'webCrawl.run' as const;

export const webCrawlStepInputSchema = lazySchema(() =>
  z.object({
    url: z.string().min(1).max(2048).describe('The page the crawl starts from.'),
    max_depth: z
      .number()
      .int()
      .min(0)
      .max(WEB_CRAWL_MAX_DEPTH_LIMIT)
      .optional()
      .describe(
        `How many links away from the URL to crawl. Defaults to ${WEB_CRAWL_DEFAULT_MAX_DEPTH}.`
      ),
    max_documents: z
      .number()
      .int()
      .min(1)
      .max(WEB_CRAWL_MAX_DOCUMENTS_LIMIT)
      .optional()
      .describe(
        `How many pages to request and index. Defaults to ${WEB_CRAWL_DEFAULT_MAX_DOCUMENTS}.`
      ),
  })
);

export const webCrawlStepOutputSchema = lazySchema(() =>
  z.object({
    crawl_id: z.string(),
    index_name: z.string(),
    status: z.enum(['completed', 'canceled']),
    documents_count: z.number(),
    failed_count: z.number(),
  })
);

export const webCrawlStepCommonDefinition: CommonStepDefinition<
  typeof webCrawlStepInputSchema,
  typeof webCrawlStepOutputSchema
> = {
  id: WEB_CRAWL_STEP_ID,
  label: i18n.translate('xpack.elasticsearchHome.workflows.webCrawlStep.label', {
    defaultMessage: 'Crawl a website',
  }),
  description: i18n.translate('xpack.elasticsearchHome.workflows.webCrawlStep.description', {
    defaultMessage:
      'Crawl a website into an index for full-text and semantic search, and wait for the crawl to finish.',
  }),
  category: StepCategory.Elasticsearch,
  inputSchema: webCrawlStepInputSchema,
  outputSchema: webCrawlStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.elasticsearchHome.workflows.webCrawlStep.details', {
      defaultMessage:
        "Follows the site's links and sitemap, respects its robots.txt, and indexes every page into the web-crawl index named after the site's host. Pages crawled before are updated in place. The step fails when the site is already being crawled.",
    }),
    examples: [
      `## Re-crawl a documentation site every day
\`\`\`yaml
triggers:
  - type: scheduled
    with:
      every: 1d
steps:
  - name: crawl
    type: ${WEB_CRAWL_STEP_ID}
    with:
      url: "https://www.elastic.co/docs"
      max_depth: 2
      max_documents: 500
\`\`\``,
    ],
  },
};
