/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { WEB_CRAWLS_PATH } from '../../common/constants';
import type { WebCrawl } from '../../common/types';
import {
  createHttpError,
  createTestQueryClient,
  createWebCrawl,
  webCrawlerContextWrapper,
} from '../test_utils';
import { WEB_CRAWL_POLL_INTERVAL_MS } from './use_web_crawl';
import { useWebCrawls } from './use_web_crawls';

const SETTLE_MS = 100;

const runningCrawl = createWebCrawl({ id: 'running-1' });
const completedCrawl = createWebCrawl({ id: 'completed-1', status: 'completed' });

describe('useWebCrawls', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const WebCrawlerContext = webCrawlerContextWrapper({ services: { http } });

    return ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <WebCrawlerContext>{children}</WebCrawlerContext>
      </QueryClientProvider>
    );
  };

  const renderWebCrawls = () => renderHook(() => useWebCrawls(), { wrapper: createWrapper() });

  const mockList = (...crawls: WebCrawl[]) => http.get.mockResolvedValue({ crawls });

  const renderLoadedWebCrawls = async (...crawls: WebCrawl[]) => {
    mockList(...crawls);
    const rendered = renderWebCrawls();
    await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
    return rendered;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
  });

  describe('listing', () => {
    it('is loading and empty until the list arrives', async () => {
      mockList(runningCrawl, completedCrawl);

      const { result } = renderWebCrawls();

      expect(result.current.isLoading).toBe(true);
      expect(result.current.crawls).toEqual([]);

      await waitFor(() => expect(result.current.crawls).toEqual([runningCrawl, completedCrawl]));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.listErrorMessage).toBeUndefined();
      expect(http.get).toHaveBeenCalledWith(WEB_CRAWLS_PATH);
    });

    it('lists the path rules and skip counts of each crawl as the server reported them', async () => {
      const crawlWithRules = createWebCrawl({
        id: 'completed-2',
        status: 'completed',
        includePaths: ['/docs'],
        excludePaths: ['/tags'],
        skippedByRobotsCount: 2,
        skippedByRulesCount: 5,
        purgedCount: 1,
      });

      const { result } = await renderLoadedWebCrawls(crawlWithRules, completedCrawl);

      expect(result.current.crawls).toEqual([crawlWithRules, completedCrawl]);
    });

    it('lists the index, start URLs and sitemap URLs of each crawl as the server reported them', async () => {
      const crawlWithTargets = createWebCrawl({
        id: 'completed-2',
        status: 'completed',
        indexName: 'docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
        sitemapUrls: ['https://example.com/sitemap-docs.xml'],
      });

      const { result } = await renderLoadedWebCrawls(crawlWithTargets, completedCrawl);

      expect(result.current.crawls).toEqual([crawlWithTargets, completedCrawl]);
      expect(result.current.crawls[1].seedUrls).toEqual([]);
      expect(result.current.crawls[1].sitemapUrls).toEqual([]);
    });

    it("surfaces the server's message when the list cannot be loaded", async () => {
      http.get.mockRejectedValue(createHttpError('Crawl history is unavailable', 500));

      const { result } = renderWebCrawls();

      await waitFor(() =>
        expect(result.current.listErrorMessage).toBe('Crawl history is unavailable')
      );
      expect(result.current.crawls).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('falls back to the error message when the failure carries no body', async () => {
      http.get.mockRejectedValue(new Error('Network down'));

      const { result } = renderWebCrawls();

      await waitFor(() => expect(result.current.listErrorMessage).toBe('Network down'));
    });
  });

  describe('starting', () => {
    it('posts the request and refreshes the list', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockResolvedValue(runningCrawl);
      mockList(runningCrawl, completedCrawl);

      act(() => {
        result.current.startCrawl({ url: 'https://example.com', maxDepth: 1, maxDocuments: 10 });
      });

      await waitFor(() => expect(result.current.crawls).toEqual([runningCrawl, completedCrawl]));
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({ url: 'https://example.com', maxDepth: 1, maxDocuments: 10 }),
      });
      expect(http.get).toHaveBeenCalledTimes(2);
      expect(result.current.isStarting).toBe(false);
      expect(result.current.startErrorMessage).toBeUndefined();
    });

    it('posts the path rules of the request', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockResolvedValue(runningCrawl);

      act(() => {
        result.current.startCrawl({
          url: 'https://example.com',
          maxDepth: 1,
          maxDocuments: 10,
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/archive'],
        });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://example.com',
          maxDepth: 1,
          maxDocuments: 10,
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/archive'],
        }),
      });
      await waitFor(() => expect(result.current.isStarting).toBe(false));
    });

    it('posts empty path rules as given, without dropping them', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockResolvedValue(runningCrawl);

      act(() => {
        result.current.startCrawl({
          url: 'https://example.com',
          includePaths: [],
          excludePaths: [],
        });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({ url: 'https://example.com', includePaths: [], excludePaths: [] }),
      });
      await waitFor(() => expect(result.current.isStarting).toBe(false));
    });

    it('posts the index, start URLs and sitemap URLs of the request', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockResolvedValue(runningCrawl);

      act(() => {
        result.current.startCrawl({
          url: 'https://example.com',
          maxDepth: 1,
          maxDocuments: 10,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://example.com/blog', 'https://docs.example.com/x,y'],
          sitemapUrls: ['https://example.com/sitemap-docs.xml'],
        });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://example.com',
          maxDepth: 1,
          maxDocuments: 10,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://example.com/blog', 'https://docs.example.com/x,y'],
          sitemapUrls: ['https://example.com/sitemap-docs.xml'],
        }),
      });
      await waitFor(() => expect(result.current.isStarting).toBe(false));
    });

    it('posts empty URL lists as given and leaves an undefined index name out', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockResolvedValue(runningCrawl);

      act(() => {
        result.current.startCrawl({
          url: 'https://example.com',
          indexName: undefined,
          seedUrls: [],
          sitemapUrls: [],
        });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: '{"url":"https://example.com","seedUrls":[],"sitemapUrls":[]}',
      });
      await waitFor(() => expect(result.current.isStarting).toBe(false));
    });

    it('reports that it is starting while the request is in flight', async () => {
      const { result } = await renderLoadedWebCrawls();
      let resolveStart: (crawl: WebCrawl) => void = () => {};
      http.post.mockReturnValue(
        new Promise((resolve) => {
          resolveStart = resolve;
        })
      );

      act(() => {
        result.current.startCrawl({ url: 'https://example.com' });
      });

      await waitFor(() => expect(result.current.isStarting).toBe(true));

      await act(async () => {
        resolveStart(runningCrawl);
      });

      await waitFor(() => expect(result.current.isStarting).toBe(false));
    });

    it("surfaces the server's message as a start error and leaves the list alone", async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.post.mockRejectedValue(createHttpError('example.com is already being crawled', 409));

      act(() => {
        result.current.startCrawl({ url: 'https://example.com' });
      });

      await waitFor(() =>
        expect(result.current.startErrorMessage).toBe('example.com is already being crawled')
      );
      expect(result.current.actionErrorMessage).toBeUndefined();
      expect(result.current.listErrorMessage).toBeUndefined();
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to the error message when the start failure carries no body', async () => {
      const { result } = await renderLoadedWebCrawls();
      http.post.mockRejectedValue(new Error('Network down'));

      act(() => {
        result.current.startCrawl({ url: 'https://example.com' });
      });

      await waitFor(() => expect(result.current.startErrorMessage).toBe('Network down'));
    });
  });

  describe('stopping', () => {
    it('posts to the cancel path of the crawl and refreshes the list', async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl);
      const stoppingCrawl = { ...runningCrawl, isStopping: true };
      http.post.mockResolvedValue(stoppingCrawl);
      mockList(stoppingCrawl);

      act(() => {
        result.current.stopCrawl('running-1');
      });

      await waitFor(() => expect(result.current.crawls).toEqual([stoppingCrawl]));
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/running-1/_cancel`);
      expect(result.current.actionErrorMessage).toBeUndefined();
    });

    it('encodes the crawl id in the cancel path', async () => {
      const { result } = await renderLoadedWebCrawls();
      http.post.mockResolvedValue(runningCrawl);

      act(() => {
        result.current.stopCrawl('odd/id');
      });

      await waitFor(() =>
        expect(http.post).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/odd%2Fid/_cancel`)
      );
    });

    it("surfaces the server's message as an action error", async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl);
      http.post.mockRejectedValue(createHttpError('The crawl already finished', 409));

      act(() => {
        result.current.stopCrawl('running-1');
      });

      await waitFor(() =>
        expect(result.current.actionErrorMessage).toBe('The crawl already finished')
      );
      expect(result.current.startErrorMessage).toBeUndefined();
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to the error message when the stop failure carries no body', async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl);
      http.post.mockRejectedValue(new Error('Network down'));

      act(() => {
        result.current.stopCrawl('running-1');
      });

      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Network down'));
    });
  });

  describe('deleting', () => {
    it('deletes the crawl by its id and refreshes the list', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.delete.mockResolvedValue(undefined);
      mockList();

      act(() => {
        result.current.deleteCrawl('completed-1');
      });

      await waitFor(() => expect(result.current.crawls).toEqual([]));
      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/completed-1`);
      expect(result.current.actionErrorMessage).toBeUndefined();
    });

    it('encodes the crawl id in the delete path', async () => {
      const { result } = await renderLoadedWebCrawls();
      http.delete.mockResolvedValue(undefined);

      act(() => {
        result.current.deleteCrawl('odd/id');
      });

      await waitFor(() => expect(http.delete).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/odd%2Fid`));
    });

    it("surfaces the server's message as an action error", async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.delete.mockRejectedValue(createHttpError('A running crawl cannot be deleted', 409));

      act(() => {
        result.current.deleteCrawl('completed-1');
      });

      await waitFor(() =>
        expect(result.current.actionErrorMessage).toBe('A running crawl cannot be deleted')
      );
      expect(result.current.crawls).toEqual([completedCrawl]);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to the error message when the delete failure carries no body', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.delete.mockRejectedValue(new Error('Network down'));

      act(() => {
        result.current.deleteCrawl('completed-1');
      });

      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Network down'));
    });
  });

  describe('action errors', () => {
    it('reports the failure of the most recent action only', async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl, completedCrawl);
      http.post.mockRejectedValue(createHttpError('Stop failed'));
      http.delete.mockRejectedValue(createHttpError('Delete failed'));

      act(() => {
        result.current.stopCrawl('running-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Stop failed'));

      act(() => {
        result.current.deleteCrawl('completed-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Delete failed'));

      act(() => {
        result.current.stopCrawl('running-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Stop failed'));
    });

    it('clears a stop failure once a later delete succeeds', async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl, completedCrawl);
      http.post.mockRejectedValue(createHttpError('Stop failed'));
      http.delete.mockResolvedValue(undefined);

      act(() => {
        result.current.stopCrawl('running-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Stop failed'));

      act(() => {
        result.current.deleteCrawl('completed-1');
      });

      await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.actionErrorMessage).toBeUndefined());
    });

    it('clears a delete failure once a later stop succeeds', async () => {
      const { result } = await renderLoadedWebCrawls(runningCrawl, completedCrawl);
      http.delete.mockRejectedValue(createHttpError('Delete failed'));
      http.post.mockResolvedValue({ ...runningCrawl, isStopping: true });

      act(() => {
        result.current.deleteCrawl('completed-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Delete failed'));

      act(() => {
        result.current.stopCrawl('running-1');
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.actionErrorMessage).toBeUndefined());
    });

    it('clears a failure once the same action succeeds on a retry', async () => {
      const { result } = await renderLoadedWebCrawls(completedCrawl);
      http.delete.mockRejectedValueOnce(createHttpError('Delete failed'));
      http.delete.mockResolvedValue(undefined);

      act(() => {
        result.current.deleteCrawl('completed-1');
      });
      await waitFor(() => expect(result.current.actionErrorMessage).toBe('Delete failed'));

      act(() => {
        result.current.deleteCrawl('completed-1');
      });

      await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.actionErrorMessage).toBeUndefined());
    });

    it('keeps the action callbacks stable across renders', async () => {
      const { result, rerender } = await renderLoadedWebCrawls(completedCrawl);
      const { startCrawl, stopCrawl, deleteCrawl } = result.current;

      rerender();

      expect(result.current.startCrawl).toBe(startCrawl);
      expect(result.current.stopCrawl).toBe(stopCrawl);
      expect(result.current.deleteCrawl).toBe(deleteCrawl);
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const advance = async (ms: number) => {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(ms);
      });
    };

    const settle = () => advance(SETTLE_MS);
    const advancePollInterval = () => advance(WEB_CRAWL_POLL_INTERVAL_MS);

    it('polls while any crawl is running and stops once none is', async () => {
      http.get
        .mockResolvedValueOnce({ crawls: [runningCrawl, completedCrawl] })
        .mockResolvedValueOnce({ crawls: [runningCrawl, completedCrawl] })
        .mockResolvedValue({
          crawls: [{ ...runningCrawl, status: 'canceled' }, completedCrawl],
        });

      const { result } = renderWebCrawls();

      await settle();
      expect(http.get).toHaveBeenCalledTimes(1);

      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(2);

      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(3);
      expect(result.current.crawls[0].status).toBe('canceled');

      await advancePollInterval();
      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it('does not poll when no crawl is running', async () => {
      mockList(
        completedCrawl,
        createWebCrawl({ id: 'failed-1', status: 'failed' }),
        createWebCrawl({ id: 'canceled-1', status: 'canceled' })
      );

      renderWebCrawls();

      await settle();
      await advancePollInterval();
      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('does not poll an empty list', async () => {
      mockList();

      renderWebCrawls();

      await settle();
      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('starts polling once a crawl was started', async () => {
      mockList(completedCrawl);
      const { result } = renderWebCrawls();
      await settle();
      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(1);

      http.post.mockResolvedValue(runningCrawl);
      mockList(runningCrawl, completedCrawl);
      act(() => {
        result.current.startCrawl({ url: 'https://example.com' });
      });
      await settle();
      expect(http.get).toHaveBeenCalledTimes(2);

      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(3);

      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(4);
    });

    it('stops polling when the hook unmounts', async () => {
      mockList(runningCrawl);
      const { unmount } = renderWebCrawls();
      await settle();
      expect(http.get).toHaveBeenCalledTimes(1);

      unmount();
      await advancePollInterval();
      await advancePollInterval();

      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });
});
