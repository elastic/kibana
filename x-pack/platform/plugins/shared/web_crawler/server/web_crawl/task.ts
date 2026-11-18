/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskCost, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { WEB_CRAWL_MAX_DEPTH_LIMIT, WEB_CRAWL_MAX_DOCUMENTS_LIMIT } from '../../common/constants';
import type { WebCrawlerServerStartDependencies } from '../types';
import type { CrawlDocument } from './crawl_storage';
import { createCrawlStorage } from './crawl_storage';
import type { CrawlProgress } from './crawler';
import { crawlSite } from './crawler';

export const WEB_CRAWL_TASK_TYPE = 'web_crawler:crawl';
/** How often a running crawl records its progress and checks whether it was asked to stop. */
export const PROGRESS_INTERVAL_MS = 3_000;
const STOPPED_BY_TASK_MANAGER_ERROR = 'The crawl was stopped before it finished';

export const validateInteger = (value: number): string | undefined =>
  Number.isInteger(value) ? undefined : 'must be an integer';

const paramsSchema = schema.object({
  url: schema.string({ maxLength: 2048 }),
  indexName: schema.string({ maxLength: 255 }),
  inferenceId: schema.string({ maxLength: 512 }),
  maxDepth: schema.number({ min: 0, max: WEB_CRAWL_MAX_DEPTH_LIMIT, validate: validateInteger }),
  maxDocuments: schema.number({
    min: 1,
    max: WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
    validate: validateInteger,
  }),
});

export type WebCrawlTaskParams = TypeOf<typeof paramsSchema>;

interface RegisterWebCrawlTaskDeps {
  core: CoreSetup<WebCrawlerServerStartDependencies>;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}

export const registerWebCrawlTask = ({ core, taskManager, logger }: RegisterWebCrawlTaskDeps) => {
  taskManager.registerTaskDefinitions({
    [WEB_CRAWL_TASK_TYPE]: {
      title: 'Elasticsearch home web crawl',
      description:
        'Crawls a website through a document_extraction inference endpoint and indexes its pages for full-text and semantic search.',
      // Up to 1000 extraction calls, 10 at a time and around 10s each, plus ingest-time inference.
      timeout: '1h',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      paramsSchema,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }) => ({
        run: async () => {
          if (!fakeRequest) {
            return throwUnrecoverableError(
              new Error('Web crawl task was scheduled without the API key it needs to run')
            );
          }

          const { id: crawlId } = taskInstance;
          const { url, indexName, inferenceId, maxDepth, maxDocuments } =
            taskInstance.params as WebCrawlTaskParams;
          const [{ elasticsearch }] = await core.getStartServices();
          const esClient = elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
          const storage = createCrawlStorage(elasticsearch.client.asInternalUser, logger);

          // Aborted by Task Manager, or when the user asks for the crawl to stop.
          const crawlAbort = new AbortController();
          const stopCrawl = () => crawlAbort.abort();
          signal.addEventListener('abort', stopCrawl, { once: true });
          if (signal.aborted) {
            stopCrawl();
          }

          let progress: CrawlProgress = {
            documentsCount: 0,
            failedCount: 0,
            requestedCount: 0,
            queuedCount: 0,
          };
          let wasCanceled = false;
          let pendingRecord: Promise<void> | undefined;
          const toProgressPatch = (): Partial<CrawlDocument> => ({
            documents_count: progress.documentsCount,
            failed_count: progress.failedCount,
            requested_count: progress.requestedCount,
            queued_count: progress.queuedCount,
            updated_at: new Date().toISOString(),
          });
          // Doubles as the heartbeat that tells a running crawl from an interrupted one.
          const recordProgress = () => {
            pendingRecord ??= storage
              .update(crawlId, toProgressPatch())
              .then((crawl) => {
                if (crawl?.cancel_requested) {
                  wasCanceled = true;
                  stopCrawl();
                }
              })
              .catch((progressError: Error) => {
                logger.debug(
                  `Web crawl ${crawlId} could not record its progress: ${progressError.message}`
                );
              })
              .finally(() => {
                pendingRecord = undefined;
              });
          };
          const progressTimer = setInterval(recordProgress, PROGRESS_INTERVAL_MS);

          let error: string | undefined;
          try {
            const result = await crawlSite({
              esClient,
              logger,
              signal: crawlAbort.signal,
              url,
              indexName,
              inferenceId,
              crawlId,
              maxDepth,
              maxDocuments,
              onProgress: (latest) => {
                progress = latest;
              },
            });
            progress = {
              ...progress,
              documentsCount: result.documentsCount,
              failedCount: result.failedCount,
              queuedCount: 0,
            };
            if (result.aborted && !wasCanceled) {
              error = STOPPED_BY_TASK_MANAGER_ERROR;
            }
          } catch (crawlError) {
            error = crawlError.message;
            logger.warn(`Web crawl of ${url} into ${indexName} failed: ${crawlError.message}`);
          } finally {
            clearInterval(progressTimer);
            signal.removeEventListener('abort', stopCrawl);
          }

          let status: CrawlDocument['status'] = 'completed';
          if (wasCanceled) {
            status = 'canceled';
          } else if (error) {
            status = 'failed';
          }

          await pendingRecord;
          // Not tied to the signal: the outcome has to be recorded when the task was aborted too.
          await storage.update(
            crawlId,
            {
              ...toProgressPatch(),
              status,
              finished_at: new Date().toISOString(),
              ...(status === 'failed' ? { error } : {}),
            },
            { refresh: true }
          );

          return { state: {} };
        },
      }),
    },
  });
};
