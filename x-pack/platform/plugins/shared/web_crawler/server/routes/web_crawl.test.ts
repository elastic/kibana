/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  WEB_CRAWLS_PATH,
  WEB_CRAWL_CANCEL_PATH,
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
  WEB_CRAWL_MAX_INDEX_NAME_LENGTH,
  WEB_CRAWL_MAX_PATH_RULES,
  WEB_CRAWL_MAX_PATH_RULE_LENGTH,
  WEB_CRAWL_MAX_SEED_URLS,
  WEB_CRAWL_MAX_SITEMAP_URLS,
  WEB_CRAWL_MAX_URL_LENGTH,
  WEB_CRAWL_PATH,
} from '../../common/constants';
import type { WebCrawl } from '../../common/types';
import {
  WebCrawlError,
  cancelCrawl,
  deleteCrawl,
  getCrawl,
  listCrawls,
  startCrawl,
} from '../web_crawl/crawl_service';
import type { CrawlStorage, StoredCrawl } from '../web_crawl/crawl_storage';
import { createCrawlStorage } from '../web_crawl/crawl_storage';
import {
  WEB_CRAWL_AUTHZ_REASON,
  getCrawlServiceDeps,
  registerWebCrawlRoutes,
  toErrorResponse,
} from './web_crawl';

jest.mock('../web_crawl/crawl_storage');
jest.mock('../web_crawl/crawl_service', () => ({
  ...jest.requireActual('../web_crawl/crawl_service'),
  startCrawl: jest.fn(),
  getCrawl: jest.fn(),
  listCrawls: jest.fn(),
  cancelCrawl: jest.fn(),
  deleteCrawl: jest.fn(),
}));

const mockCreateCrawlStorage = jest.mocked(createCrawlStorage);
const mockStartCrawl = jest.mocked(startCrawl);
const mockGetCrawl = jest.mocked(getCrawl);
const mockListCrawls = jest.mocked(listCrawls);
const mockCancelCrawl = jest.mocked(cancelCrawl);
const mockDeleteCrawl = jest.mocked(deleteCrawl);

const CRAWL_URL = 'https://example.com/';
const CRAWL_ID = 'f3b9c1de-4a55-4c4e-9a53-0d8c1f0a2b6e';

const STORED: StoredCrawl = {
  id: CRAWL_ID,
  url: CRAWL_URL,
  index_name: 'web-crawl-example.com',
  status: 'running',
  max_depth: 2,
  max_documents: 500,
  started_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:03.000Z',
  documents_count: 4,
  failed_count: 1,
  requested_count: 9,
  queued_count: 20,
  started_by: 'elastic',
  include_paths: ['/docs', '/blog'],
  exclude_paths: ['/docs/internal'],
  seed_urls: ['https://example.com/blog', 'https://docs.example.org/'],
  sitemap_urls: ['https://example.com/sitemaps/docs.xml'],
  skipped_robots_count: 3,
  skipped_rules_count: 12,
  purged_count: 5,
};

const WEB_CRAWL: WebCrawl = {
  id: CRAWL_ID,
  indexName: 'web-crawl-example.com',
  url: CRAWL_URL,
  status: 'running',
  maxDepth: 2,
  maxDocuments: 500,
  includePaths: ['/docs', '/blog'],
  excludePaths: ['/docs/internal'],
  seedUrls: ['https://example.com/blog', 'https://docs.example.org/'],
  sitemapUrls: ['https://example.com/sitemaps/docs.xml'],
  documentsCount: 4,
  failedCount: 1,
  requestedCount: 9,
  queuedCount: 20,
  skippedByRobotsCount: 3,
  skippedByRulesCount: 12,
  purgedCount: 5,
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: undefined,
  error: undefined,
  isStopping: false,
  startedBy: 'elastic',
  workflowId: undefined,
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('toErrorResponse', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    response = httpServerMock.createResponseFactory();
  });

  it.each([400, 403, 404, 409] as const)(
    'exposes the message and status of a %i WebCrawlError',
    (statusCode) => {
      toErrorResponse(response, logger, new WebCrawlError('Written for the user', statusCode), 'x');

      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: { message: 'Written for the user' },
      });
      expect(logger.warn).not.toHaveBeenCalled();
    }
  );

  it('hides the message of any other error and logs it', () => {
    toErrorResponse(response, logger, new Error('secret internals'), 'Failed to do the thing');

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to do the thing' },
    });
    expect(logger.warn).toHaveBeenCalledWith('Failed to do the thing: secret internals');
  });

  it.each([403, 404, 503])('keeps the %i status of an Elasticsearch error', (statusCode) => {
    toErrorResponse(response, logger, createEsError(statusCode), 'Failed to do the thing');

    expect(response.customError).toHaveBeenCalledWith({
      statusCode,
      body: { message: 'Failed to do the thing' },
    });
  });
});

describe('registerWebCrawlRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let core: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let storage: jest.Mocked<CrawlStorage>;
  let getStartServices: jest.Mock;

  const createContext = (coreOverride?: Promise<never>) =>
    coreMock.createCustomRequestHandlerContext({
      core: coreOverride ?? Promise.resolve(core),
    });

  const getExpectedDeps = () => ({
    esClient: core.elasticsearch.client.asCurrentUser,
    storage,
    taskManager,
    logger,
  });

  const getRoutes = () => {
    const [startRoute, cancelRoute] = router.post.mock.calls;
    const [listRoute, getRoute] = router.get.mock.calls;
    const [deleteRoute] = router.delete.mock.calls;
    return { startRoute, cancelRoute, listRoute, getRoute, deleteRoute };
  };

  const getParamsSchema = (route: 'getRoute' | 'cancelRoute' | 'deleteRoute') => {
    const [config] = getRoutes()[route];
    const { params } = config.validate as { params: ObjectType };
    return params;
  };

  const callWithId = async (
    route: 'getRoute' | 'cancelRoute' | 'deleteRoute',
    coreOverride?: Promise<never>
  ) => {
    const request = httpServerMock.createKibanaRequest({
      params: getParamsSchema(route).validate({ id: CRAWL_ID }),
    });
    const response = httpServerMock.createResponseFactory();
    const context = createContext(coreOverride);
    const { getRoute, cancelRoute, deleteRoute } = getRoutes();
    if (route === 'getRoute') {
      await getRoute[1](context, request, response);
    } else if (route === 'cancelRoute') {
      await cancelRoute[1](context, request, response);
    } else {
      await deleteRoute[1](context, request, response);
    }
    return response;
  };

  const expectNoSuccess = (response: ReturnType<typeof httpServerMock.createResponseFactory>) => {
    expect(response.ok).not.toHaveBeenCalled();
    expect(response.noContent).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    taskManager = taskManagerMock.createStart();
    core = coreMock.createRequestHandlerContext();
    storage = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    getStartServices = jest.fn().mockResolvedValue([coreMock.createStart(), { taskManager }, {}]);

    mockCreateCrawlStorage.mockReturnValue(storage);
    mockStartCrawl.mockResolvedValue(STORED);
    mockGetCrawl.mockResolvedValue(STORED);
    mockListCrawls.mockResolvedValue([STORED]);
    mockCancelCrawl.mockResolvedValue(STORED);
    mockDeleteCrawl.mockResolvedValue(undefined);

    registerWebCrawlRoutes(router, logger, getStartServices);
  });

  it('registers the five crawl routes', () => {
    const { startRoute, cancelRoute, listRoute, getRoute, deleteRoute } = getRoutes();

    expect(router.post).toHaveBeenCalledTimes(2);
    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.delete).toHaveBeenCalledTimes(1);
    expect(startRoute[0].path).toBe(WEB_CRAWLS_PATH);
    expect(listRoute[0].path).toBe(WEB_CRAWLS_PATH);
    expect(getRoute[0].path).toBe(WEB_CRAWL_PATH);
    expect(deleteRoute[0].path).toBe(WEB_CRAWL_PATH);
    expect(cancelRoute[0].path).toBe(WEB_CRAWL_CANCEL_PATH);
  });

  it('keeps the routes internal', () => {
    expect(WEB_CRAWLS_PATH).toBe('/internal/web_crawler/crawls');
    expect(WEB_CRAWL_PATH).toBe('/internal/web_crawler/crawls/{id}');
    expect(WEB_CRAWL_CANCEL_PATH).toBe('/internal/web_crawler/crawls/{id}/_cancel');
  });

  it.each(['startRoute', 'cancelRoute', 'listRoute', 'getRoute', 'deleteRoute'] as const)(
    'delegates the authorization of the %s to Elasticsearch',
    (route) => {
      const [config] = getRoutes()[route];

      expect(config.security?.authz).toEqual({ enabled: false, reason: WEB_CRAWL_AUTHZ_REASON });
      expect(WEB_CRAWL_AUTHZ_REASON).toMatch(/index/);
    }
  );

  it('does not validate a body or params for the list route', () => {
    expect(getRoutes().listRoute[0].validate).toBe(false);
  });

  describe.each(['getRoute', 'cancelRoute', 'deleteRoute'] as const)(
    'params validation of the %s',
    (route) => {
      const validateParams = (params: unknown) => () => getParamsSchema(route).validate(params);

      it('accepts a crawl ID', () => {
        expect(validateParams({ id: CRAWL_ID })()).toEqual({ id: CRAWL_ID });
      });

      it('rejects a missing or empty ID', () => {
        expect(validateParams({})).toThrow(/\[id\]/);
        expect(validateParams({ id: '' })).toThrow(/minimum length/);
      });

      it('bounds the ID to 64 characters', () => {
        expect(validateParams({ id: 'a'.repeat(64) })).not.toThrow();
        expect(validateParams({ id: 'a'.repeat(65) })).toThrow(/maximum length/);
      });

      it('rejects unknown params', () => {
        expect(validateParams({ id: CRAWL_ID, indexName: 'x' })).toThrow(/\[indexName\]/);
      });
    }
  );

  describe('getCrawlServiceDeps', () => {
    it('acts on the crawled index as the user and on the crawl state as the system user', async () => {
      const deps = await getCrawlServiceDeps(createContext(), getStartServices, logger);

      expect(deps).toEqual(getExpectedDeps());
      expect(deps.esClient).toBe(core.elasticsearch.client.asCurrentUser);
      expect(mockCreateCrawlStorage).toHaveBeenCalledTimes(1);
      expect(mockCreateCrawlStorage).toHaveBeenCalledWith(
        core.elasticsearch.client.asInternalUser,
        logger
      );
    });
  });

  describe('POST start crawl', () => {
    const getBodySchema = () => {
      const [config] = getRoutes().startRoute;
      const { body: bodySchema } = config.validate as { body: ObjectType };
      return bodySchema;
    };

    const callStart = async (
      body: {
        url: string;
        maxDepth?: number;
        maxDocuments?: number;
        includePaths?: string[];
        excludePaths?: string[];
        indexName?: string;
        seedUrls?: string[];
        sitemapUrls?: string[];
      } = { url: CRAWL_URL },
      coreOverride?: Promise<never>
    ) => {
      const request = httpServerMock.createKibanaRequest({ body: getBodySchema().validate(body) });
      const response = httpServerMock.createResponseFactory();
      await getRoutes().startRoute[1](createContext(coreOverride), request, response);
      return { request, response };
    };

    describe('body validation', () => {
      const validateBody = (body: unknown) => () => getBodySchema().validate(body);

      it('accepts a URL and applies the default limits', () => {
        expect(WEB_CRAWL_DEFAULT_MAX_DEPTH).toBe(2);
        expect(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS).toBe(500);
        expect(validateBody({ url: CRAWL_URL })()).toEqual({
          url: CRAWL_URL,
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        });
      });

      it('applies each default limit independently', () => {
        expect(validateBody({ url: CRAWL_URL, maxDepth: 4 })()).toEqual({
          url: CRAWL_URL,
          maxDepth: 4,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        });
        expect(validateBody({ url: CRAWL_URL, maxDocuments: 20 })()).toEqual({
          url: CRAWL_URL,
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: 20,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        });
      });

      describe.each(['includePaths', 'excludePaths'] as const)('%s', (key) => {
        const otherKey = key === 'includePaths' ? 'excludePaths' : 'includePaths';
        const longestPath = `/${'a'.repeat(WEB_CRAWL_MAX_PATH_RULE_LENGTH - 1)}`;
        const toPaths = (count: number): string[] =>
          Array.from({ length: count }, (_, position) => `/section-${position}`);
        const pattern = new RegExp(`\\[${key}`);

        it('accepts a list of paths and leaves the other list empty', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: ['/docs', '/blog'] })()).toEqual(
            expect.objectContaining({ [key]: ['/docs', '/blog'], [otherKey]: [] })
          );
        });

        it('accepts an empty list', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: [] })()).toEqual(
            expect.objectContaining({ [key]: [] })
          );
        });

        it(`accepts ${WEB_CRAWL_MAX_PATH_RULES} paths and rejects more`, () => {
          expect(WEB_CRAWL_MAX_PATH_RULES).toBe(20);
          expect(
            validateBody({ url: CRAWL_URL, [key]: toPaths(WEB_CRAWL_MAX_PATH_RULES) })
          ).not.toThrow();
          expect(
            validateBody({ url: CRAWL_URL, [key]: toPaths(WEB_CRAWL_MAX_PATH_RULES + 1) })
          ).toThrow(pattern);
        });

        it(`accepts a path of ${WEB_CRAWL_MAX_PATH_RULE_LENGTH} characters and rejects a longer one`, () => {
          expect(WEB_CRAWL_MAX_PATH_RULE_LENGTH).toBe(256);
          expect(validateBody({ url: CRAWL_URL, [key]: [longestPath] })).not.toThrow();
          expect(validateBody({ url: CRAWL_URL, [key]: [`${longestPath}a`] })).toThrow(
            /maximum length/
          );
        });

        it('rejects an empty path', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: ['/docs', ''] })).toThrow(/minimum length/);
        });

        it('rejects what is not a list of strings', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: '/docs' })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: [7] })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: [null] })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: null })).toThrow(pattern);
        });

        it('leaves it to the crawl service to refuse a path that does not start with a /', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: ['docs'] })()).toEqual(
            expect.objectContaining({ [key]: ['docs'] })
          );
        });
      });

      describe.each([
        ['seedUrls', 'sitemapUrls', WEB_CRAWL_MAX_SEED_URLS],
        ['sitemapUrls', 'seedUrls', WEB_CRAWL_MAX_SITEMAP_URLS],
      ] as const)('%s', (key, otherKey, maxUrls) => {
        const longestUrl = `${CRAWL_URL}${'a'.repeat(WEB_CRAWL_MAX_URL_LENGTH - CRAWL_URL.length)}`;
        const toUrls = (count: number): string[] =>
          Array.from({ length: count }, (_, position) => `${CRAWL_URL}page-${position}`);
        const pattern = new RegExp(`\\[${key}`);

        it('accepts a list of URLs, in the order given, and leaves the other list empty', () => {
          const urls = ['https://example.com/blog', 'https://docs.example.org/'];

          expect(validateBody({ url: CRAWL_URL, [key]: urls })()).toEqual(
            expect.objectContaining({ [key]: urls, [otherKey]: [] })
          );
        });

        it('accepts an empty list', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: [] })()).toEqual(
            expect.objectContaining({ [key]: [] })
          );
        });

        it('accepts 20 URLs and rejects more', () => {
          expect(maxUrls).toBe(20);
          expect(validateBody({ url: CRAWL_URL, [key]: toUrls(maxUrls) })()).toEqual(
            expect.objectContaining({ [key]: toUrls(maxUrls) })
          );
          expect(validateBody({ url: CRAWL_URL, [key]: toUrls(maxUrls + 1) })).toThrow(pattern);
        });

        it('accepts a URL of 2048 characters and rejects a longer one', () => {
          expect(longestUrl).toHaveLength(2048);
          expect(validateBody({ url: CRAWL_URL, [key]: [longestUrl] })).not.toThrow();
          expect(validateBody({ url: CRAWL_URL, [key]: [`${longestUrl}a`] })).toThrow(
            /maximum length/
          );
        });

        it('rejects an empty URL', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: [CRAWL_URL, ''] })).toThrow(
            /minimum length/
          );
        });

        it('rejects what is not a list of strings', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: CRAWL_URL })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: [7] })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: [null] })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: null })).toThrow(pattern);
          expect(validateBody({ url: CRAWL_URL, [key]: [[CRAWL_URL]] })).toThrow(pattern);
        });

        it('leaves it to the crawl service to refuse what is not an http or https URL', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: ['not a url'] })()).toEqual(
            expect.objectContaining({ [key]: ['not a url'] })
          );
        });

        it('leaves duplicates for the crawl service to drop', () => {
          expect(validateBody({ url: CRAWL_URL, [key]: [CRAWL_URL, CRAWL_URL] })()).toEqual(
            expect.objectContaining({ [key]: [CRAWL_URL, CRAWL_URL] })
          );
        });
      });

      describe('indexName', () => {
        it('is left out of the body when it is not given, so the crawl service names the index', () => {
          expect(validateBody({ url: CRAWL_URL })()).not.toHaveProperty('indexName');
        });

        it('accepts an index name', () => {
          expect(validateBody({ url: CRAWL_URL, indexName: 'product-docs' })()).toEqual(
            expect.objectContaining({ url: CRAWL_URL, indexName: 'product-docs' })
          );
        });

        it('accepts a name of 1 to 255 characters and rejects a longer one', () => {
          expect(WEB_CRAWL_MAX_INDEX_NAME_LENGTH).toBe(255);
          expect(validateBody({ url: CRAWL_URL, indexName: 'a' })).not.toThrow();
          expect(validateBody({ url: CRAWL_URL, indexName: 'a'.repeat(255) })).not.toThrow();
          expect(validateBody({ url: CRAWL_URL, indexName: 'a'.repeat(256) })).toThrow(
            /\[indexName\].*maximum length/
          );
        });

        it('rejects an empty name', () => {
          expect(validateBody({ url: CRAWL_URL, indexName: '' })).toThrow(
            /\[indexName\].*minimum length/
          );
        });

        it('rejects what is not a string', () => {
          expect(validateBody({ url: CRAWL_URL, indexName: 7 })).toThrow(/\[indexName\]/);
          expect(validateBody({ url: CRAWL_URL, indexName: null })).toThrow(/\[indexName\]/);
          expect(validateBody({ url: CRAWL_URL, indexName: ['product-docs'] })).toThrow(
            /\[indexName\]/
          );
        });

        it('leaves it to the crawl service to refuse a name with characters it does not allow', () => {
          expect(validateBody({ url: CRAWL_URL, indexName: 'Product Docs*' })()).toEqual(
            expect.objectContaining({ indexName: 'Product Docs*' })
          );
        });
      });

      it.each([0, 1, 3, WEB_CRAWL_MAX_DEPTH_LIMIT])('accepts a maxDepth of %i', (maxDepth) => {
        expect(validateBody({ url: CRAWL_URL, maxDepth })()).toEqual(
          expect.objectContaining({ maxDepth })
        );
      });

      it.each([-1, WEB_CRAWL_MAX_DEPTH_LIMIT + 1, 1.5, 0.5, Infinity, NaN])(
        'rejects a maxDepth of %p',
        (maxDepth) => {
          expect(validateBody({ url: CRAWL_URL, maxDepth })).toThrow(/\[maxDepth\]/);
        }
      );

      it.each([1, 7, 500, WEB_CRAWL_MAX_DOCUMENTS_LIMIT])(
        'accepts a maxDocuments of %i',
        (maxDocuments) => {
          expect(validateBody({ url: CRAWL_URL, maxDocuments })()).toEqual(
            expect.objectContaining({ maxDocuments })
          );
        }
      );

      it.each([-1, 0, WEB_CRAWL_MAX_DOCUMENTS_LIMIT + 1, 10.5, 1.0001, Infinity, NaN])(
        'rejects a maxDocuments of %p',
        (maxDocuments) => {
          expect(validateBody({ url: CRAWL_URL, maxDocuments })).toThrow(/\[maxDocuments\]/);
        }
      );

      it('rejects non-numeric limits', () => {
        expect(validateBody({ url: CRAWL_URL, maxDepth: 'deep' })).toThrow(/\[maxDepth\]/);
        expect(validateBody({ url: CRAWL_URL, maxDocuments: [10] })).toThrow(/\[maxDocuments\]/);
        expect(validateBody({ url: CRAWL_URL, maxDepth: null })).toThrow(/\[maxDepth\]/);
      });

      it('rejects unknown body fields', () => {
        expect(validateBody({ url: CRAWL_URL, depth: 3 })).toThrow(/\[depth\]/);
        expect(validateBody({ url: CRAWL_URL, startedBy: 'someone else' })).toThrow(
          /\[startedBy\]/
        );
        expect(validateBody({ url: CRAWL_URL, workflowId: 'workflow-1' })).toThrow(
          /\[workflowId\]/
        );
      });

      it('rejects a missing or empty URL', () => {
        expect(validateBody({})).toThrow(/\[url\]/);
        expect(validateBody({ url: '' })).toThrow(/minimum length/);
      });

      it('rejects a URL longer than 2048 characters', () => {
        expect(validateBody({ url: `${CRAWL_URL}${'a'.repeat(2048)}` })).toThrow(/maximum length/);
      });
    });

    it('starts the crawl with the request and returns it', async () => {
      core.security.authc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({ username: 'elastic' })
      );

      const { request, response } = await callStart({
        url: CRAWL_URL,
        maxDepth: 4,
        maxDocuments: 50,
      });

      expect(mockStartCrawl).toHaveBeenCalledTimes(1);
      expect(mockStartCrawl).toHaveBeenCalledWith(getExpectedDeps(), {
        request,
        url: CRAWL_URL,
        maxDepth: 4,
        maxDocuments: 50,
        includePaths: [],
        excludePaths: [],
        seedUrls: [],
        sitemapUrls: [],
        startedBy: 'elastic',
      });
      expect(mockStartCrawl.mock.calls[0][1]).not.toHaveProperty('indexName');
      expect(response.ok).toHaveBeenCalledWith({ body: WEB_CRAWL });
      expect(response.customError).not.toHaveBeenCalled();
    });

    it('passes the paths to include and exclude to the crawl', async () => {
      await callStart({
        url: CRAWL_URL,
        includePaths: ['/docs', '/blog'],
        excludePaths: ['/docs/internal'],
      });

      expect(mockStartCrawl.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/internal'],
        })
      );
    });

    it('passes the index, the other start URLs and the sitemap URLs to the crawl', async () => {
      core.security.authc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({ username: 'elastic' })
      );

      const { request } = await callStart({
        url: CRAWL_URL,
        indexName: 'product-docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.org/'],
        sitemapUrls: ['https://example.com/sitemaps/docs.xml'],
      });

      expect(mockStartCrawl).toHaveBeenCalledWith(getExpectedDeps(), {
        request,
        url: CRAWL_URL,
        maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
        maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        includePaths: [],
        excludePaths: [],
        indexName: 'product-docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.org/'],
        sitemapUrls: ['https://example.com/sitemaps/docs.xml'],
        startedBy: 'elastic',
      });
    });

    it('returns the index, the start URLs and the sitemap URLs the crawl was recorded with', async () => {
      mockStartCrawl.mockResolvedValue({
        ...STORED,
        index_name: 'product-docs',
        seed_urls: ['https://docs.example.org/'],
        sitemap_urls: [],
      });

      const { response } = await callStart({
        url: CRAWL_URL,
        indexName: 'product-docs',
        seedUrls: ['https://docs.example.org/#top', CRAWL_URL],
      });

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          ...WEB_CRAWL,
          indexName: 'product-docs',
          seedUrls: ['https://docs.example.org/'],
          sitemapUrls: [],
        },
      });
    });

    it.each([
      'Start URLs and sitemap URLs must be valid http or https URLs',
      'Index names start with a lowercase letter or a digit, and contain only lowercase letters, digits, dots, hyphens and underscores',
    ])('returns the 400 of the crawl service: %s', async (message) => {
      mockStartCrawl.mockRejectedValue(new WebCrawlError(message, 400));

      const { response } = await callStart({
        url: CRAWL_URL,
        indexName: 'Product Docs',
        seedUrls: ['nope'],
      });

      expect(response.customError).toHaveBeenCalledWith({ statusCode: 400, body: { message } });
      expectNoSuccess(response);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns a crawl stored before start URLs and sitemap URLs existed with none', async () => {
      const { seed_urls: seedUrls, sitemap_urls: sitemapUrls, ...storedBefore } = STORED;
      mockStartCrawl.mockResolvedValue(storedBefore);

      const { response } = await callStart();

      expect(response.ok).toHaveBeenCalledWith({
        body: { ...WEB_CRAWL, seedUrls: [], sitemapUrls: [] },
      });
    });

    it('returns the 400 of the crawl service when a path does not start with a /', async () => {
      mockStartCrawl.mockRejectedValue(
        new WebCrawlError('Paths to include or exclude must start with a /', 400)
      );

      const { response } = await callStart({ url: CRAWL_URL, includePaths: ['docs'] });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: 'Paths to include or exclude must start with a /' },
      });
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('returns a crawl stored before path rules existed with empty rules and zero counts', async () => {
      const {
        include_paths: includePaths,
        exclude_paths: excludePaths,
        skipped_robots_count: skippedByRobotsCount,
        skipped_rules_count: skippedByRulesCount,
        purged_count: purgedCount,
        ...storedBefore
      } = STORED;
      mockStartCrawl.mockResolvedValue(storedBefore);

      const { response } = await callStart();

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          ...WEB_CRAWL,
          includePaths: [],
          excludePaths: [],
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
        },
      });
    });

    it('passes the default limits when none were requested', async () => {
      await callStart();

      expect(mockStartCrawl.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        })
      );
    });

    it('starts the crawl without a user name when there is no current user', async () => {
      core.security.authc.getCurrentUser.mockReturnValue(null);

      const { response } = await callStart();

      expect(mockStartCrawl.mock.calls[0][1].startedBy).toBeUndefined();
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it.each([
      [400, 'Enter a valid http or https URL'],
      [400, 'No document_extraction inference endpoint is available'],
      [403, 'Missing the write privilege on web-crawl-example.com'],
      [409, 'A crawl into web-crawl-example.com is already running'],
      [409, 'A crawl into product-docs is already running'],
      [409, 'Index product-docs already exists and was not created by a crawl'],
      [403, 'Missing the write privilege on product-docs'],
    ] as const)('returns the %i "%s"', async (statusCode, message) => {
      mockStartCrawl.mockRejectedValue(new WebCrawlError(message, statusCode));

      const { response } = await callStart();

      expect(response.customError).toHaveBeenCalledWith({ statusCode, body: { message } });
      expectNoSuccess(response);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('hides an unexpected failure behind a generic message', async () => {
      mockStartCrawl.mockRejectedValue(new Error('task manager unavailable'));

      const { response } = await callStart();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to start the web crawl' },
      });
      expectNoSuccess(response);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('task manager unavailable'));
    });

    it('returns the Elasticsearch status code when Elasticsearch refuses', async () => {
      mockStartCrawl.mockRejectedValue(createEsError(403));

      const { response } = await callStart();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'Failed to start the web crawl' },
      });
    });

    it('returns a custom error when resolving the core context throws', async () => {
      const { response } = await callStart(
        { url: CRAWL_URL },
        Promise.reject(new Error('core unavailable'))
      );

      expect(mockStartCrawl).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to start the web crawl' },
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('core unavailable'));
    });
  });

  describe('GET crawls', () => {
    const callList = async (coreOverride?: Promise<never>) => {
      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await getRoutes().listRoute[1](createContext(coreOverride), request, response);
      return response;
    };

    it('returns the crawls the user may see', async () => {
      const finished: StoredCrawl = {
        ...STORED,
        id: 'crawl-2',
        status: 'failed',
        finished_at: '2026-01-01T00:10:00.000Z',
        error: 'boom',
        workflow_id: 'workflow-1',
      };
      mockListCrawls.mockResolvedValue([STORED, finished]);

      const response = await callList();

      expect(mockListCrawls).toHaveBeenCalledWith(getExpectedDeps());
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          crawls: [
            WEB_CRAWL,
            {
              ...WEB_CRAWL,
              id: 'crawl-2',
              status: 'failed',
              finishedAt: '2026-01-01T00:10:00.000Z',
              error: 'boom',
              workflowId: 'workflow-1',
            },
          ],
        },
      });
    });

    it('returns an empty list when there are no crawls', async () => {
      mockListCrawls.mockResolvedValue([]);

      const response = await callList();

      expect(response.ok).toHaveBeenCalledWith({ body: { crawls: [] } });
    });

    it('hides an unexpected failure behind a generic message', async () => {
      mockListCrawls.mockRejectedValue(createEsError(503));

      const response = await callList();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Failed to list the web crawls' },
      });
      expectNoSuccess(response);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('status 503'));
    });

    it('returns a custom error when resolving the core context throws', async () => {
      const response = await callList(Promise.reject(new Error('core unavailable')));

      expect(mockListCrawls).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('GET crawl', () => {
    it('returns the crawl', async () => {
      const response = await callWithId('getRoute');

      expect(mockGetCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
      expect(response.ok).toHaveBeenCalledWith({ body: WEB_CRAWL });
    });

    it('returns a 404 for a crawl that is missing or that the user may not see', async () => {
      const message = `No crawl found with ID ${CRAWL_ID}`;
      mockGetCrawl.mockRejectedValue(new WebCrawlError(message, 404));

      const response = await callWithId('getRoute');

      expect(response.customError).toHaveBeenCalledWith({ statusCode: 404, body: { message } });
      expectNoSuccess(response);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('hides an unexpected failure behind a generic message', async () => {
      mockGetCrawl.mockRejectedValue(new Error('task manager unavailable'));

      const response = await callWithId('getRoute');

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to read the web crawl' },
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('task manager unavailable'));
    });
  });

  describe('POST cancel crawl', () => {
    it('asks the crawl to stop and returns it', async () => {
      mockCancelCrawl.mockResolvedValue({ ...STORED, cancel_requested: true });

      const response = await callWithId('cancelRoute');

      expect(mockCancelCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
      expect(response.ok).toHaveBeenCalledWith({ body: { ...WEB_CRAWL, isStopping: true } });
    });

    it.each([
      [403, 'Missing the write privilege on web-crawl-example.com'],
      [404, `No crawl found with ID ${CRAWL_ID}`],
    ] as const)('returns the %i "%s"', async (statusCode, message) => {
      mockCancelCrawl.mockRejectedValue(new WebCrawlError(message, statusCode));

      const response = await callWithId('cancelRoute');

      expect(response.customError).toHaveBeenCalledWith({ statusCode, body: { message } });
      expectNoSuccess(response);
    });

    it('hides an unexpected failure behind a generic message', async () => {
      mockCancelCrawl.mockRejectedValue(createEsError(503));

      const response = await callWithId('cancelRoute');

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Failed to stop the web crawl' },
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('status 503'));
    });
  });

  describe('DELETE crawl', () => {
    it('deletes the crawl and returns no content', async () => {
      const response = await callWithId('deleteRoute');

      expect(mockDeleteCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
      expect(response.noContent).toHaveBeenCalledTimes(1);
      expect(response.customError).not.toHaveBeenCalled();
    });

    it.each([
      [403, 'Missing the write privilege on web-crawl-example.com'],
      [404, `No crawl found with ID ${CRAWL_ID}`],
      [409, 'Stop the crawl before deleting it'],
    ] as const)('returns the %i "%s"', async (statusCode, message) => {
      mockDeleteCrawl.mockRejectedValue(new WebCrawlError(message, statusCode));

      const response = await callWithId('deleteRoute');

      expect(response.customError).toHaveBeenCalledWith({ statusCode, body: { message } });
      expectNoSuccess(response);
    });

    it('hides an unexpected failure behind a generic message', async () => {
      mockDeleteCrawl.mockRejectedValue(new Error('cluster is busy'));

      const response = await callWithId('deleteRoute');

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to delete the web crawl' },
      });
      expectNoSuccess(response);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster is busy'));
    });

    it('returns a custom error when resolving the core context throws', async () => {
      const response = await callWithId(
        'deleteRoute',
        Promise.reject(new Error('core unavailable'))
      );

      expect(mockDeleteCrawl).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});
