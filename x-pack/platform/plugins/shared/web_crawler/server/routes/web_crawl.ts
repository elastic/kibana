/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  IKibanaResponse,
  IRouter,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
} from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import {
  WEB_CRAWLS_PATH,
  WEB_CRAWL_CANCEL_PATH,
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
  WEB_CRAWL_MAX_INDEX_NAME_LENGTH,
  WEB_CRAWL_PATH,
} from '../../common/constants';
import type { WebCrawl, WebCrawlListResponse } from '../../common/types';
import type { WebCrawlerServerStartDependencies } from '../types';
import type { CrawlServiceDeps } from '../web_crawl/crawl_service';
import {
  WebCrawlError,
  cancelCrawl,
  deleteCrawl,
  getCrawl,
  listCrawls,
  startCrawl,
  toWebCrawl,
} from '../web_crawl/crawl_service';
import { createCrawlStorage } from '../web_crawl/crawl_storage';
import {
  pathRulesSchema,
  seedUrlsSchema,
  sitemapUrlsSchema,
  validateInteger,
} from '../web_crawl/task';

export const WEB_CRAWL_AUTHZ_REASON =
  'Crawls are authorized through the index they write to: Elasticsearch checks the current user for the inference endpoint and for creating, writing and reading that index, and the crawl task runs with an API key granted from the request';

export const crawlLimitsSchema = {
  maxDepth: schema.number({
    min: 0,
    max: WEB_CRAWL_MAX_DEPTH_LIMIT,
    defaultValue: WEB_CRAWL_DEFAULT_MAX_DEPTH,
    validate: validateInteger,
  }),
  maxDocuments: schema.number({
    min: 1,
    max: WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
    defaultValue: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
    validate: validateInteger,
  }),
};

const crawlIdParamsSchema = schema.object({ id: schema.string({ minLength: 1, maxLength: 64 }) });

type GetStartServices = CoreSetup<WebCrawlerServerStartDependencies>['getStartServices'];

export const getCrawlServiceDeps = async (
  context: RequestHandlerContext,
  getStartServices: GetStartServices,
  logger: Logger
): Promise<CrawlServiceDeps> => {
  const { elasticsearch } = await context.core;
  const [, { taskManager }] = await getStartServices();
  return {
    esClient: elasticsearch.client.asCurrentUser,
    storage: createCrawlStorage(elasticsearch.client.asInternalUser, logger),
    taskManager,
    logger,
  };
};

/** Maps a failure to a response, exposing the message only when it was written for the user. */
export const toErrorResponse = (
  response: KibanaResponseFactory,
  logger: Logger,
  error: Error & { statusCode?: number },
  fallbackMessage: string
): IKibanaResponse => {
  if (error instanceof WebCrawlError) {
    return response.customError({
      statusCode: error.statusCode,
      body: { message: error.message },
    });
  }
  logger.warn(`${fallbackMessage}: ${error.message}`);
  const { statusCode = 500 } = error;
  return response.customError({
    statusCode: statusCode >= 400 ? statusCode : 500,
    body: { message: fallbackMessage },
  });
};

export const registerWebCrawlRoutes = (
  router: IRouter,
  logger: Logger,
  getStartServices: GetStartServices
) => {
  const security = { authz: AuthzDisabled.fromReason(WEB_CRAWL_AUTHZ_REASON) };

  router.post(
    {
      path: WEB_CRAWLS_PATH,
      validate: {
        body: schema.object({
          url: schema.string({ minLength: 1, maxLength: 2048 }),
          ...crawlLimitsSchema,
          includePaths: pathRulesSchema,
          excludePaths: pathRulesSchema,
          indexName: schema.maybe(
            schema.string({ minLength: 1, maxLength: WEB_CRAWL_MAX_INDEX_NAME_LENGTH })
          ),
          seedUrls: seedUrlsSchema,
          sitemapUrls: sitemapUrlsSchema,
        }),
      },
      security,
    },
    async (context, request, response) => {
      try {
        const deps = await getCrawlServiceDeps(context, getStartServices, logger);
        const { security: coreSecurity } = await context.core;
        const crawl = await startCrawl(deps, {
          request,
          ...request.body,
          startedBy: coreSecurity.authc.getCurrentUser()?.username,
        });
        const body: WebCrawl = toWebCrawl(crawl);
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, logger, error, 'Failed to start the web crawl');
      }
    }
  );

  router.get(
    { path: WEB_CRAWLS_PATH, validate: false, security },
    async (context, request, response) => {
      try {
        const deps = await getCrawlServiceDeps(context, getStartServices, logger);
        const body: WebCrawlListResponse = { crawls: (await listCrawls(deps)).map(toWebCrawl) };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, logger, error, 'Failed to list the web crawls');
      }
    }
  );

  router.get(
    { path: WEB_CRAWL_PATH, validate: { params: crawlIdParamsSchema }, security },
    async (context, request, response) => {
      try {
        const deps = await getCrawlServiceDeps(context, getStartServices, logger);
        const body: WebCrawl = toWebCrawl(await getCrawl(deps, request.params.id));
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, logger, error, 'Failed to read the web crawl');
      }
    }
  );

  router.post(
    { path: WEB_CRAWL_CANCEL_PATH, validate: { params: crawlIdParamsSchema }, security },
    async (context, request, response) => {
      try {
        const deps = await getCrawlServiceDeps(context, getStartServices, logger);
        const body: WebCrawl = toWebCrawl(await cancelCrawl(deps, request.params.id));
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, logger, error, 'Failed to stop the web crawl');
      }
    }
  );

  router.delete(
    { path: WEB_CRAWL_PATH, validate: { params: crawlIdParamsSchema }, security },
    async (context, request, response) => {
      try {
        const deps = await getCrawlServiceDeps(context, getStartServices, logger);
        await deleteCrawl(deps, request.params.id);
        return response.noContent();
      } catch (error) {
        return toErrorResponse(response, logger, error, 'Failed to delete the web crawl');
      }
    }
  );
};
