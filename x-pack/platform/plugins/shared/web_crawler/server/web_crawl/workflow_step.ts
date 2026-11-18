/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
} from '../../common/constants';
import { webCrawlStepCommonDefinition } from '../../common/web_crawl_step';
import type { WebCrawlerServerStartDependencies } from '../types';
import type { CrawlServiceDeps } from './crawl_service';
import { cancelCrawl, getCrawl, startCrawl } from './crawl_service';
import { createCrawlStorage } from './crawl_storage';

const POLL_INTERVAL_MS = 15_000;
// The crawl task times out after an hour; this leaves room for it to record that.
const MAX_POLLS = (75 * 60_000) / POLL_INTERVAL_MS;

const stateSchema = lazySchema(() => z.object({ crawl_id: z.string() }));

type ContextManager = StepHandlerContext['contextManager'];

interface WebCrawlStepDeps {
  getStartServices: CoreSetup<WebCrawlerServerStartDependencies>['getStartServices'];
  logger: Logger;
}

/**
 * A workflow step that starts a crawl as the workflow's user and waits for it between polls, so a
 * scheduled workflow re-crawls a site and later steps can act on the outcome.
 */
export const getWebCrawlStepDefinition = ({ getStartServices, logger }: WebCrawlStepDeps) => {
  const getServiceDeps = async (contextManager: ContextManager): Promise<CrawlServiceDeps> => {
    const [{ elasticsearch }, { taskManager }] = await getStartServices();
    return {
      esClient: contextManager.getScopedEsClient(),
      storage: createCrawlStorage(elasticsearch.client.asInternalUser, logger),
      taskManager,
      logger,
    };
  };

  return createPollServerStepDefinition({
    ...webCrawlStepCommonDefinition,
    stateSchema,
    start: async ({ input, contextManager }) => {
      const { workflow, execution } = contextManager.getContext();
      const crawl = await startCrawl(await getServiceDeps(contextManager), {
        request: contextManager.getFakeRequest(),
        url: input.url,
        maxDepth: input.max_depth ?? WEB_CRAWL_DEFAULT_MAX_DEPTH,
        maxDocuments: input.max_documents ?? WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        startedBy: execution.executedBy,
        workflowId: workflow.id,
      });
      return { state: { crawl_id: crawl.id } };
    },
    poll: async ({ state, contextManager }) => {
      if (!state) {
        throw new Error('The crawl step was polled before it started a crawl');
      }
      const crawl = await getCrawl(await getServiceDeps(contextManager), state.crawl_id);
      switch (crawl.status) {
        case 'running':
          return undefined;
        case 'failed':
          return { error: new Error(crawl.error ?? `The crawl of ${crawl.url} failed`) };
        default:
          return {
            output: {
              crawl_id: crawl.id,
              index_name: crawl.index_name,
              status: crawl.status,
              documents_count: crawl.documents_count,
              failed_count: crawl.failed_count,
            },
          };
      }
    },
    onCancel: async (context) => {
      // Canceled before `start` returned, there is no crawl to stop yet.
      if ('state' in context && context.state) {
        const deps = await getServiceDeps(context.contextManager);
        await cancelCrawl(deps, context.state.crawl_id);
      }
    },
    policy: { strategy: 'fixed', intervalMs: POLL_INTERVAL_MS },
    ceilings: { maxAttempts: MAX_POLLS, maxWaitMs: POLL_INTERVAL_MS },
  });
};
