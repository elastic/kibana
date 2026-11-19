/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { z } from '@kbn/zod/v4';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_INDEX_NAME_LENGTH,
  WEB_CRAWL_MAX_PATH_RULES,
  WEB_CRAWL_MAX_PATH_RULE_LENGTH,
  WEB_CRAWL_MAX_SEED_URLS,
  WEB_CRAWL_MAX_SITEMAP_URLS,
  WEB_CRAWL_MAX_URL_LENGTH,
} from '../../common/constants';
import {
  WEB_CRAWL_STEP_ID,
  webCrawlStepCommonDefinition,
  webCrawlStepInputSchema,
  webCrawlStepOutputSchema,
} from '../../common/web_crawl_step';
import { WebCrawlError, cancelCrawl, getCrawl, startCrawl } from './crawl_service';
import type { CrawlStorage, StoredCrawl } from './crawl_storage';
import { createCrawlStorage } from './crawl_storage';
import { getWebCrawlStepDefinition } from './workflow_step';

jest.mock('./crawl_storage');
jest.mock('./crawl_service', () => ({
  ...jest.requireActual('./crawl_service'),
  startCrawl: jest.fn(),
  getCrawl: jest.fn(),
  cancelCrawl: jest.fn(),
}));

const mockCreateCrawlStorage = jest.mocked(createCrawlStorage);
const mockStartCrawl = jest.mocked(startCrawl);
const mockGetCrawl = jest.mocked(getCrawl);
const mockCancelCrawl = jest.mocked(cancelCrawl);

const CRAWL_URL = 'https://example.com/';
const CRAWL_ID = 'crawl-1';
const WORKFLOW_ID = 'workflow-1';

const RUNNING: StoredCrawl = {
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
};

type StepDefinition = ReturnType<typeof getWebCrawlStepDefinition>;
type StartContext = Parameters<NonNullable<StepDefinition['start']>>[0];
type PollContext = Parameters<StepDefinition['poll']>[0];
type StepInput = StartContext['input'];
type StepState = PollContext['state'];

describe('getWebCrawlStepDefinition', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let scopedEsClient: ElasticsearchClientMock;
  let storage: jest.Mocked<CrawlStorage>;
  let fakeRequest: KibanaRequest;
  let getStartServices: jest.Mock;
  let definition: StepDefinition;

  const createStartContext = (input: StepInput = { url: CRAWL_URL }) =>
    ({
      input,
      rawInput: input,
      config: {},
      contextManager: {
        getContext: jest.fn().mockReturnValue({
          workflow: { id: WORKFLOW_ID },
          execution: { id: 'execution-1', executedBy: 'elastic' },
        }),
        getScopedEsClient: jest.fn().mockReturnValue(scopedEsClient),
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        renderInputTemplate: jest.fn(),
      },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      stepId: 'crawl',
      stepType: WEB_CRAWL_STEP_ID,
    } as unknown as StartContext);

  const createPollContext = (state: StepState): PollContext => ({
    ...createStartContext(),
    state,
    attempt: 0,
  });

  const getExpectedDeps = () => ({ esClient: scopedEsClient, storage, taskManager, logger });

  const start = (input?: StepInput) => {
    if (!definition.start) {
      throw new Error('Expected the step to define a start phase');
    }
    return definition.start(createStartContext(input));
  };

  const poll = (state: StepState = { crawl_id: CRAWL_ID }) =>
    definition.poll(createPollContext(state));

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    coreStart = coreMock.createStart();
    taskManager = taskManagerMock.createStart();
    scopedEsClient = elasticsearchServiceMock.createElasticsearchClient();
    fakeRequest = httpServerMock.createKibanaRequest();
    storage = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    getStartServices = jest.fn().mockResolvedValue([coreStart, { taskManager }, {}]);

    mockCreateCrawlStorage.mockReturnValue(storage);
    mockStartCrawl.mockResolvedValue(RUNNING);
    mockGetCrawl.mockResolvedValue(RUNNING);
    mockCancelCrawl.mockResolvedValue({ ...RUNNING, cancel_requested: true });

    definition = getWebCrawlStepDefinition({ getStartServices, logger });
  });

  describe('definition', () => {
    it('extends the common step definition', () => {
      expect(definition.id).toBe('webCrawl.run');
      expect(definition).toEqual(expect.objectContaining(webCrawlStepCommonDefinition));
    });

    it('polls every 15 seconds for longer than the crawl task may run', () => {
      expect(definition.policy).toEqual({ strategy: 'fixed', intervalMs: 15_000 });
      expect(definition.ceilings).toEqual({ maxAttempts: 300, maxWaitMs: 15_000 });
      expect((definition.ceilings?.maxAttempts ?? 0) * 15_000).toBeGreaterThan(60 * 60_000);
    });

    it('does not resolve the start services until a phase runs', () => {
      expect(getStartServices).not.toHaveBeenCalled();
      expect(mockCreateCrawlStorage).not.toHaveBeenCalled();
    });

    describe('input', () => {
      const isValidInput = (input: Record<string, string | number | string[] | number[]>) =>
        webCrawlStepInputSchema.safeParse(input).success;

      const longestPath = `/${'a'.repeat(WEB_CRAWL_MAX_PATH_RULE_LENGTH - 1)}`;
      const toPaths = (count: number): string[] =>
        Array.from({ length: count }, (_, position) => `/section-${position}`);

      it('needs nothing but a URL', () => {
        expect(webCrawlStepInputSchema.parse({ url: CRAWL_URL })).toEqual({ url: CRAWL_URL });
      });

      it('accepts paths to include and to exclude', () => {
        const input = {
          url: CRAWL_URL,
          include_paths: ['/docs', '/blog'],
          exclude_paths: ['/docs/internal'],
        };

        expect(webCrawlStepInputSchema.parse(input)).toEqual(input);
      });

      it.each(['include_paths', 'exclude_paths'] as const)(
        `bounds %s to ${WEB_CRAWL_MAX_PATH_RULES} paths of 1 to ${WEB_CRAWL_MAX_PATH_RULE_LENGTH} characters`,
        (key) => {
          expect(isValidInput({ url: CRAWL_URL, [key]: [] })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: toPaths(WEB_CRAWL_MAX_PATH_RULES) })).toBe(
            true
          );
          expect(
            isValidInput({ url: CRAWL_URL, [key]: toPaths(WEB_CRAWL_MAX_PATH_RULES + 1) })
          ).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: [longestPath] })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: [`${longestPath}a`] })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: [''] })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: '/docs' })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: [7] })).toBe(false);
        }
      );

      it('accepts an index, more start URLs and sitemap URLs', () => {
        const input = {
          url: CRAWL_URL,
          index_name: 'product-docs',
          seed_urls: ['https://example.com/blog', 'https://docs.example.org/'],
          sitemap_urls: ['https://example.com/sitemaps/docs.xml'],
        };

        expect(webCrawlStepInputSchema.parse(input)).toEqual(input);
      });

      it('leaves the index, the start URLs and the sitemap URLs out when they are not given', () => {
        const input = webCrawlStepInputSchema.parse({ url: CRAWL_URL });

        expect(input).not.toHaveProperty('index_name');
        expect(input).not.toHaveProperty('seed_urls');
        expect(input).not.toHaveProperty('sitemap_urls');
      });

      it.each([
        ['seed_urls', WEB_CRAWL_MAX_SEED_URLS],
        ['sitemap_urls', WEB_CRAWL_MAX_SITEMAP_URLS],
      ] as const)(
        `bounds %s to %i URLs of 1 to ${WEB_CRAWL_MAX_URL_LENGTH} characters`,
        (key, maxUrls) => {
          const toUrls = (count: number): string[] =>
            Array.from({ length: count }, (_, position) => `${CRAWL_URL}page-${position}`);
          const longestUrl = `${CRAWL_URL}${'a'.repeat(
            WEB_CRAWL_MAX_URL_LENGTH - CRAWL_URL.length
          )}`;

          expect(maxUrls).toBe(20);
          expect(longestUrl).toHaveLength(2048);
          expect(isValidInput({ url: CRAWL_URL, [key]: [] })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: toUrls(maxUrls) })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: toUrls(maxUrls + 1) })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: [longestUrl] })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: [`${longestUrl}a`] })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: ['a'] })).toBe(true);
          expect(isValidInput({ url: CRAWL_URL, [key]: [''] })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: CRAWL_URL })).toBe(false);
          expect(isValidInput({ url: CRAWL_URL, [key]: [7] })).toBe(false);
        }
      );

      it(`bounds index_name to 1 to ${WEB_CRAWL_MAX_INDEX_NAME_LENGTH} characters`, () => {
        expect(WEB_CRAWL_MAX_INDEX_NAME_LENGTH).toBe(255);
        expect(isValidInput({ url: CRAWL_URL, index_name: 'a' })).toBe(true);
        expect(isValidInput({ url: CRAWL_URL, index_name: 'a'.repeat(255) })).toBe(true);
        expect(isValidInput({ url: CRAWL_URL, index_name: 'a'.repeat(256) })).toBe(false);
        expect(isValidInput({ url: CRAWL_URL, index_name: '' })).toBe(false);
        expect(isValidInput({ url: CRAWL_URL, index_name: 7 })).toBe(false);
        expect(isValidInput({ url: CRAWL_URL, index_name: ['product-docs'] })).toBe(false);
      });

      it('leaves it to the crawl service to refuse an index name or a URL it does not allow', () => {
        expect(
          isValidInput({
            url: CRAWL_URL,
            index_name: 'Product Docs*',
            seed_urls: ['not a url'],
            sitemap_urls: ['ftp://example.com/sitemap.xml'],
          })
        ).toBe(true);
      });

      it('describes the new inputs for the workflow editor', () => {
        const { properties } = z.toJSONSchema(webCrawlStepInputSchema);

        expect(properties?.index_name).toEqual(
          expect.objectContaining({ description: expect.stringContaining('index') })
        );
        expect(properties?.seed_urls).toEqual(
          expect.objectContaining({ description: expect.stringContaining('start from') })
        );
        expect(properties?.sitemap_urls).toEqual(
          expect.objectContaining({ description: expect.stringContaining('Sitemaps') })
        );
      });
    });

    describe('output', () => {
      const OUTPUT = {
        crawl_id: CRAWL_ID,
        index_name: 'web-crawl-example.com',
        status: 'completed',
        documents_count: 42,
        failed_count: 3,
        purged_count: 5,
      };

      it('reports how many outdated pages the crawl removed', () => {
        expect(webCrawlStepOutputSchema.parse(OUTPUT)).toEqual(OUTPUT);
      });

      it('always has the number of removed pages', () => {
        const { purged_count: purgedCount, ...outputWithoutPurgedCount } = OUTPUT;

        expect(webCrawlStepOutputSchema.safeParse(outputWithoutPurgedCount).success).toBe(false);
        expect(webCrawlStepOutputSchema.safeParse({ ...OUTPUT, purged_count: '5' }).success).toBe(
          false
        );
      });
    });
  });

  describe('start', () => {
    it('starts the crawl as the user of the workflow and keeps its ID as state', async () => {
      await expect(start({ url: CRAWL_URL, max_depth: 4, max_documents: 50 })).resolves.toEqual({
        state: { crawl_id: CRAWL_ID },
      });

      expect(mockStartCrawl).toHaveBeenCalledTimes(1);
      expect(mockStartCrawl).toHaveBeenCalledWith(getExpectedDeps(), {
        request: fakeRequest,
        url: CRAWL_URL,
        maxDepth: 4,
        maxDocuments: 50,
        includePaths: undefined,
        excludePaths: undefined,
        indexName: undefined,
        seedUrls: undefined,
        sitemapUrls: undefined,
        startedBy: 'elastic',
        workflowId: WORKFLOW_ID,
      });
    });

    it('passes the index, the other start URLs and the sitemap URLs to the crawl', async () => {
      await start({
        url: CRAWL_URL,
        index_name: 'product-docs',
        seed_urls: ['https://example.com/blog', 'https://docs.example.org/'],
        sitemap_urls: ['https://example.com/sitemaps/docs.xml'],
      });

      expect(mockStartCrawl).toHaveBeenCalledWith(getExpectedDeps(), {
        request: fakeRequest,
        url: CRAWL_URL,
        maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
        maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        includePaths: undefined,
        excludePaths: undefined,
        indexName: 'product-docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.org/'],
        sitemapUrls: ['https://example.com/sitemaps/docs.xml'],
        startedBy: 'elastic',
        workflowId: WORKFLOW_ID,
      });
    });

    it('leaves the index for the crawl service to name, and starts from the one URL, when the input has nothing else', async () => {
      await start({ url: CRAWL_URL });

      const [, options] = mockStartCrawl.mock.calls[0];
      expect(options.indexName).toBeUndefined();
      expect(options.seedUrls).toBeUndefined();
      expect(options.sitemapUrls).toBeUndefined();
    });

    it('passes each of them on its own', async () => {
      await start({ url: CRAWL_URL, index_name: 'product-docs' });
      await start({ url: CRAWL_URL, seed_urls: ['https://docs.example.org/'] });
      await start({ url: CRAWL_URL, sitemap_urls: ['https://example.com/s.xml'] });

      expect(
        mockStartCrawl.mock.calls.map(([, { indexName, seedUrls, sitemapUrls }]) => ({
          indexName,
          seedUrls,
          sitemapUrls,
        }))
      ).toEqual([
        { indexName: 'product-docs', seedUrls: undefined, sitemapUrls: undefined },
        { indexName: undefined, seedUrls: ['https://docs.example.org/'], sitemapUrls: undefined },
        { indexName: undefined, seedUrls: undefined, sitemapUrls: ['https://example.com/s.xml'] },
      ]);
    });

    it.each([
      [400, 'Start URLs and sitemap URLs must be valid http or https URLs'],
      [
        400,
        'Index names start with a lowercase letter or a digit, and contain only lowercase letters, digits, dots, hyphens and underscores',
      ],
      [409, 'A crawl into product-docs is already running'],
      [409, 'Index product-docs already exists and was not created by a crawl'],
    ] as const)('fails the step with the %i "%s"', async (statusCode, message) => {
      mockStartCrawl.mockRejectedValue(new WebCrawlError(message, statusCode));

      await expect(
        start({ url: CRAWL_URL, index_name: 'product-docs', seed_urls: ['nope'] })
      ).rejects.toThrow(message);
    });

    it('passes the paths to include and to exclude to the crawl', async () => {
      await start({
        url: CRAWL_URL,
        include_paths: ['/docs', '/blog'],
        exclude_paths: ['/docs/internal'],
      });

      expect(mockStartCrawl.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/internal'],
        })
      );
    });

    it('passes each list of paths independently', async () => {
      await start({ url: CRAWL_URL, include_paths: ['/docs'] });
      await start({ url: CRAWL_URL, exclude_paths: ['/blog'] });

      const [[, includeOnly], [, excludeOnly]] = mockStartCrawl.mock.calls;
      expect(includeOnly.includePaths).toEqual(['/docs']);
      expect(includeOnly.excludePaths).toBeUndefined();
      expect(excludeOnly.includePaths).toBeUndefined();
      expect(excludeOnly.excludePaths).toEqual(['/blog']);
    });

    it('leaves the paths out when the step has none', async () => {
      await start({ url: CRAWL_URL });

      const [[, options]] = mockStartCrawl.mock.calls;
      expect(options.includePaths).toBeUndefined();
      expect(options.excludePaths).toBeUndefined();
    });

    it('records the crawl state as the Kibana system user', async () => {
      await start();

      expect(mockCreateCrawlStorage).toHaveBeenCalledWith(
        coreStart.elasticsearch.client.asInternalUser,
        logger
      );
    });

    it('applies the default limits', async () => {
      await start({ url: CRAWL_URL });

      expect(mockStartCrawl.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        })
      );
    });

    it('applies each default limit independently', async () => {
      await start({ url: CRAWL_URL, max_depth: 0 });
      await start({ url: CRAWL_URL, max_documents: 1 });

      const [[, depthOnly], [, documentsOnly]] = mockStartCrawl.mock.calls;
      expect(depthOnly).toEqual(
        expect.objectContaining({ maxDepth: 0, maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS })
      );
      expect(documentsOnly).toEqual(
        expect.objectContaining({ maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH, maxDocuments: 1 })
      );
    });

    it.each([
      [400, 'Enter a valid http or https URL'],
      [400, 'Paths to include or exclude must start with a /'],
      [403, 'Missing the write privilege on web-crawl-example.com'],
      [409, 'A crawl into web-crawl-example.com is already running'],
    ] as const)('fails with the %i "%s" from the crawl service', async (statusCode, message) => {
      const error = new WebCrawlError(message, statusCode);
      mockStartCrawl.mockRejectedValue(error);

      await expect(start()).rejects.toBe(error);
    });

    it('fails when the start services cannot be resolved', async () => {
      getStartServices.mockRejectedValue(new Error('not started'));

      await expect(start()).rejects.toThrow('not started');

      expect(mockStartCrawl).not.toHaveBeenCalled();
    });
  });

  describe('poll', () => {
    it('reads the crawl as the user of the workflow', async () => {
      await poll();

      expect(mockGetCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
    });

    it('keeps polling while the crawl is running', async () => {
      await expect(poll()).resolves.toBeUndefined();
    });

    it('keeps polling while the crawl is stopping', async () => {
      mockGetCrawl.mockResolvedValue({ ...RUNNING, cancel_requested: true });

      await expect(poll()).resolves.toBeUndefined();
    });

    it.each(['completed', 'canceled'] as const)(
      'returns the outcome of a %s crawl',
      async (status) => {
        mockGetCrawl.mockResolvedValue({
          ...RUNNING,
          status,
          documents_count: 42,
          failed_count: 3,
          purged_count: 5,
          finished_at: '2026-01-01T00:10:00.000Z',
        });

        const result = await poll();

        expect(result).toEqual({
          output: {
            crawl_id: CRAWL_ID,
            index_name: 'web-crawl-example.com',
            status,
            documents_count: 42,
            failed_count: 3,
            purged_count: 5,
          },
        });
        expect(webCrawlStepOutputSchema.safeParse(result?.output).success).toBe(true);
      }
    );

    it.each(['completed', 'canceled'] as const)(
      'reports no removed pages for a %s crawl that recorded none',
      async (status) => {
        mockGetCrawl.mockResolvedValue({ ...RUNNING, status });

        const result = await poll();

        expect(result?.output?.purged_count).toBe(0);
        expect(webCrawlStepOutputSchema.safeParse(result?.output).success).toBe(true);
      }
    );

    it('fails the step with the error of a failed crawl', async () => {
      mockGetCrawl.mockResolvedValue({
        ...RUNNING,
        status: 'failed',
        error: 'No content could be extracted',
      });

      const result = await poll();

      expect(result).toEqual({ error: expect.any(Error) });
      expect(result?.error?.message).toBe('No content could be extracted');
      expect(result?.output).toBeUndefined();
    });

    it('fails the step with a fallback message when the failed crawl recorded no error', async () => {
      mockGetCrawl.mockResolvedValue({ ...RUNNING, status: 'failed' });

      const result = await poll();

      expect(result?.error?.message).toBe(`The crawl of ${CRAWL_URL} failed`);
    });

    it('throws when it is polled without a crawl', async () => {
      await expect(definition.poll(createPollContext(undefined))).rejects.toThrow(
        'The crawl step was polled before it started a crawl'
      );

      expect(mockGetCrawl).not.toHaveBeenCalled();
    });

    it('throws when the crawl can no longer be read', async () => {
      const error = new WebCrawlError(`No crawl found with ID ${CRAWL_ID}`, 404);
      mockGetCrawl.mockRejectedValue(error);

      await expect(poll()).rejects.toBe(error);
    });
  });

  describe('onCancel', () => {
    it('asks the crawl to stop as the user of the workflow', async () => {
      await definition.onCancel?.(createPollContext({ crawl_id: CRAWL_ID }));

      expect(mockCancelCrawl).toHaveBeenCalledTimes(1);
      expect(mockCancelCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
    });

    it('does nothing when the step was canceled before it started a crawl', async () => {
      await definition.onCancel?.(createPollContext(undefined));
      await definition.onCancel?.(createStartContext() as PollContext);

      expect(getStartServices).not.toHaveBeenCalled();
      expect(mockCancelCrawl).not.toHaveBeenCalled();
    });

    it('surfaces a failure to stop the crawl', async () => {
      const error = new WebCrawlError('Missing the write privilege on web-crawl-example.com', 403);
      mockCancelCrawl.mockRejectedValue(error);

      await expect(definition.onCancel?.(createPollContext({ crawl_id: CRAWL_ID }))).rejects.toBe(
        error
      );
    });
  });
});
