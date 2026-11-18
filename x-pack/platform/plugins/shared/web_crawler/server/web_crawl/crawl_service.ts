/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { WEB_CRAWLS_LIST_SIZE } from '../../common/constants';
import type { WebCrawl } from '../../common/types';
import {
  createCrawlIndex,
  getCrawlIndexName,
  getIndexPrivileges,
  readCrawlIndexState,
} from './crawl_index';
import type { CrawlDocument, CrawlStorage, StoredCrawl } from './crawl_storage';
import { ACTIVE_CRAWL_STATUSES } from './crawl_storage';
import { findDocumentExtractionEndpoint } from './document_extraction';
import { normalizeUrl } from './links';
import type { WebCrawlTaskParams } from './task';
import { WEB_CRAWL_TASK_TYPE } from './task';

export const INTERRUPTED_ERROR = 'The crawl was interrupted before it finished';
/**
 * A running crawl rewrites its document every few seconds. One that has been silent for this long
 * and has no task left was cut short, for example by a Kibana restart.
 */
export const INTERRUPTED_AFTER_MS = 60_000;

/** A failure the caller caused or can act on, carrying the HTTP status that describes it. */
export class WebCrawlError extends Error {
  constructor(message: string, public readonly statusCode: 400 | 403 | 404 | 409) {
    super(message);
    this.name = 'WebCrawlError';
  }
}

export interface CrawlServiceDeps {
  /** Scoped to the user, so Elasticsearch authorizes what is done to the crawled index. */
  esClient: ElasticsearchClient;
  storage: CrawlStorage;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

export interface StartCrawlOptions {
  /** Grants the API key the crawl task runs with. */
  request: KibanaRequest;
  url: string;
  maxDepth: number;
  maxDocuments: number;
  startedBy?: string;
  workflowId?: string;
}

export const toWebCrawl = (crawl: StoredCrawl): WebCrawl => ({
  id: crawl.id,
  indexName: crawl.index_name,
  url: crawl.url,
  status: crawl.status,
  maxDepth: crawl.max_depth,
  maxDocuments: crawl.max_documents,
  documentsCount: crawl.documents_count,
  failedCount: crawl.failed_count,
  requestedCount: crawl.requested_count,
  queuedCount: crawl.queued_count,
  startedAt: crawl.started_at,
  finishedAt: crawl.finished_at,
  error: crawl.error,
  isStopping: crawl.status === 'running' && crawl.cancel_requested === true,
  startedBy: crawl.started_by,
  workflowId: crawl.workflow_id,
});

const isTaskScheduled = async (
  taskManager: TaskManagerStartContract,
  taskId: string
): Promise<boolean> => {
  try {
    await taskManager.get(taskId);
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

/**
 * Settles a crawl that is recorded as running but whose task is gone. The task records its
 * outcome before it is removed, so the crawl is read again before it is declared interrupted.
 */
const reconcileCrawl = async (
  { storage, taskManager }: Pick<CrawlServiceDeps, 'storage' | 'taskManager'>,
  crawl: StoredCrawl
): Promise<StoredCrawl | undefined> => {
  if (
    crawl.status !== 'running' ||
    Date.now() - Date.parse(crawl.updated_at) < INTERRUPTED_AFTER_MS ||
    (await isTaskScheduled(taskManager, crawl.id))
  ) {
    return crawl;
  }
  const latest = await storage.get(crawl.id);
  if (!latest || latest.status !== 'running') {
    return latest;
  }
  const now = new Date().toISOString();
  const settled = await storage.update(
    crawl.id,
    latest.cancel_requested
      ? { status: 'canceled', finished_at: now, updated_at: now }
      : { status: 'failed', finished_at: now, updated_at: now, error: INTERRUPTED_ERROR },
    { refresh: true }
  );
  return settled;
};

const assertIndexPrivilege = async (
  esClient: ElasticsearchClient,
  indexName: string,
  privilege: 'read' | 'write'
): Promise<void> => {
  const { [indexName]: isAllowed } = await getIndexPrivileges(esClient, [indexName], privilege);
  if (!isAllowed) {
    throw new WebCrawlError(`Missing the ${privilege} privilege on ${indexName}`, 403);
  }
};

/** Reads a crawl the user may see. A crawl into an index the user cannot read is reported as missing. */
export const getCrawl = async (deps: CrawlServiceDeps, id: string): Promise<StoredCrawl> => {
  const crawl = await deps.storage.get(id);
  if (!crawl) {
    throw new WebCrawlError(`No crawl found with ID ${id}`, 404);
  }
  const { [crawl.index_name]: canRead } = await getIndexPrivileges(
    deps.esClient,
    [crawl.index_name],
    'read'
  );
  if (!canRead) {
    throw new WebCrawlError(`No crawl found with ID ${id}`, 404);
  }
  const reconciled = await reconcileCrawl(deps, crawl);
  if (!reconciled) {
    throw new WebCrawlError(`No crawl found with ID ${id}`, 404);
  }
  return reconciled;
};

/** Lists the most recent crawls into indices the user can read, running ones included. */
export const listCrawls = async (deps: CrawlServiceDeps): Promise<StoredCrawl[]> => {
  const crawls = await deps.storage.find({ size: WEB_CRAWLS_LIST_SIZE });
  const indexNames = [...new Set(crawls.map((crawl) => crawl.index_name))];
  const canRead = await getIndexPrivileges(deps.esClient, indexNames, 'read');
  const reconciled = await Promise.all(
    crawls.filter((crawl) => canRead[crawl.index_name]).map((crawl) => reconcileCrawl(deps, crawl))
  );
  return reconciled.filter((crawl): crawl is StoredCrawl => crawl !== undefined);
};

/**
 * Starts a crawl of `url` into the index named after its host. Crawls of different sites run side
 * by side; a site that is already being crawled is not crawled again until that crawl ends.
 */
export const startCrawl = async (
  deps: CrawlServiceDeps,
  { request, url: rawUrl, maxDepth, maxDocuments, startedBy, workflowId }: StartCrawlOptions
): Promise<StoredCrawl> => {
  const { esClient, storage, taskManager, logger } = deps;
  const url = normalizeUrl(rawUrl);
  if (!url) {
    throw new WebCrawlError('Enter a valid http or https URL', 400);
  }

  const inferenceId = await findDocumentExtractionEndpoint(esClient);
  if (!inferenceId) {
    throw new WebCrawlError('No document_extraction inference endpoint is available', 400);
  }

  const indexName = getCrawlIndexName(url);
  const { exists, isCrawlIndex } = await readCrawlIndexState(esClient, indexName);
  if (exists && !isCrawlIndex) {
    throw new WebCrawlError(
      `Index ${indexName} already exists and was not created by a crawl`,
      409
    );
  }

  if (exists) {
    await assertIndexPrivilege(esClient, indexName, 'write');
  }

  const findActiveCrawls = () =>
    storage.find({ indexName, statuses: ACTIVE_CRAWL_STATUSES, size: 10 });
  const activeCrawls = await Promise.all(
    (await findActiveCrawls()).map((crawl) => reconcileCrawl(deps, crawl))
  );
  if (activeCrawls.some((crawl) => crawl?.status === 'running')) {
    throw new WebCrawlError(`A crawl into ${indexName} is already running`, 409);
  }

  if (!exists) {
    await createCrawlIndex(esClient, indexName, { url });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const document: CrawlDocument = {
    url,
    index_name: indexName,
    status: 'running',
    max_depth: maxDepth,
    max_documents: maxDocuments,
    started_at: now,
    updated_at: now,
    documents_count: 0,
    failed_count: 0,
    requested_count: 0,
    queued_count: 0,
    started_by: startedBy,
    workflow_id: workflowId,
  };
  await storage.create(id, document);

  // Two requests can both find no running crawl. Each then sees the other's record and backs
  // off, which can refuse both but never lets both crawl the site.
  if ((await findActiveCrawls()).some((crawl) => crawl.id !== id)) {
    await storage.delete(id);
    throw new WebCrawlError(`A crawl into ${indexName} is already running`, 409);
  }

  const params: WebCrawlTaskParams = { url, indexName, inferenceId, maxDepth, maxDocuments };
  try {
    await taskManager.schedule(
      { id, taskType: WEB_CRAWL_TASK_TYPE, params, state: {} },
      { request }
    );
  } catch (error) {
    const failedAt = new Date().toISOString();
    await storage
      .update(
        id,
        {
          status: 'failed',
          finished_at: failedAt,
          updated_at: failedAt,
          error: 'The crawl could not be scheduled',
        },
        { refresh: true }
      )
      .catch((storageError) => {
        logger.warn(`Failed to record the web crawl scheduling failure: ${storageError.message}`);
      });
    throw error;
  }

  return { ...document, id };
};

/** Asks a running crawl to stop. The crawl keeps what it indexed and ends as `canceled`. */
export const cancelCrawl = async (deps: CrawlServiceDeps, id: string): Promise<StoredCrawl> => {
  const crawl = await getCrawl(deps, id);
  await assertIndexPrivilege(deps.esClient, crawl.index_name, 'write');
  if (crawl.status !== 'running') {
    return crawl;
  }
  const updated = await deps.storage.update(id, { cancel_requested: true }, { refresh: true });
  if (!updated) {
    throw new WebCrawlError(`No crawl found with ID ${id}`, 404);
  }
  return updated;
};

/** Removes a finished crawl from the history. The crawled index is left as it is. */
export const deleteCrawl = async (deps: CrawlServiceDeps, id: string): Promise<void> => {
  const crawl = await getCrawl(deps, id);
  await assertIndexPrivilege(deps.esClient, crawl.index_name, 'write');
  if (crawl.status === 'running') {
    throw new WebCrawlError('Stop the crawl before deleting it', 409);
  }
  await deps.storage.delete(id);
};
