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
import type { WebCrawlStartRequest } from '../../common/types';
import {
  TEST_STORAGE_KEY_PREFIX,
  createHttpError,
  createTestQueryClient,
  createWebCrawl,
  homeContextWrapper,
} from '../test_utils';
import { WEB_CRAWL_ID_KEY_SUFFIX, WEB_CRAWL_POLL_INTERVAL_MS, useWebCrawl } from './use_web_crawl';

const CRAWL_ID = 'crawl-1';
const STORAGE_KEY = `${TEST_STORAGE_KEY_PREFIX}.${WEB_CRAWL_ID_KEY_SUFFIX}`;
const CRAWL_PATH = `${WEB_CRAWLS_PATH}/${CRAWL_ID}`;
const SETTLE_MS = 100;

const startRequest: WebCrawlStartRequest = {
  url: 'https://example.com',
  maxDepth: 3,
  maxDocuments: 250,
};

describe('useWebCrawl', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const HomeContext = homeContextWrapper({ services: { http } });

    return ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <HomeContext>{children}</HomeContext>
      </QueryClientProvider>
    );
  };

  const renderWebCrawl = () => renderHook(() => useWebCrawl(), { wrapper: createWrapper() });

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    http = httpServiceMock.createStartContract();
  });

  it('does not request a crawl when none is stored', () => {
    const { result } = renderWebCrawl();

    expect(http.get).not.toHaveBeenCalled();
    expect(result.current.crawl).toBeUndefined();
    expect(result.current.isStarting).toBe(false);
    expect(result.current.startErrorMessage).toBeUndefined();
  });

  it('follows the crawl stored by an earlier page load', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(CRAWL_ID));
    const crawl = createWebCrawl({ status: 'completed', documentsCount: 12 });
    http.get.mockResolvedValue(crawl);

    const { result } = renderWebCrawl();

    await waitFor(() => expect(result.current.crawl).toEqual(crawl));
    expect(http.get).toHaveBeenCalledWith(CRAWL_PATH);
  });

  it('encodes the stored crawl id in the path', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify('odd/id'));
    http.get.mockResolvedValue(createWebCrawl({ id: 'odd/id', status: 'completed' }));

    renderWebCrawl();

    await waitFor(() => expect(http.get).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/odd%2Fid`));
  });

  it('leaves the crawl undefined when the stored crawl no longer exists', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(CRAWL_ID));
    http.get.mockRejectedValue(createHttpError('Crawl [crawl-1] not found', 404));

    const { result } = renderWebCrawl();

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.crawl).toBeUndefined());
    expect(result.current.startErrorMessage).toBeUndefined();
  });

  it('starts a crawl, persists its id and exposes it before its first status request resolves', async () => {
    const startedCrawl = createWebCrawl({ maxDepth: 3, maxDocuments: 250 });
    http.post.mockResolvedValue(startedCrawl);
    http.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderWebCrawl();

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.crawl).toEqual(startedCrawl));
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
      body: JSON.stringify({ url: 'https://example.com', maxDepth: 3, maxDocuments: 250 }),
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(CRAWL_ID));
    expect(result.current.isStarting).toBe(false);
    expect(result.current.startErrorMessage).toBeUndefined();
  });

  it('follows a newly started crawl instead of the one stored before', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify('crawl-0'));
    http.get.mockImplementation(async (path) =>
      String(path).endsWith('/crawl-0')
        ? createWebCrawl({ id: 'crawl-0', status: 'completed' })
        : createWebCrawl({ status: 'completed', documentsCount: 8 })
    );
    http.post.mockResolvedValue(createWebCrawl());

    const { result } = renderWebCrawl();
    await waitFor(() => expect(result.current.crawl?.id).toBe('crawl-0'));

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.crawl?.documentsCount).toBe(8));
    expect(result.current.crawl?.id).toBe(CRAWL_ID);
    expect(http.get).toHaveBeenCalledWith(CRAWL_PATH);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(CRAWL_ID));
  });

  it('posts a request without limits as is, leaving the defaults to the server', async () => {
    http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
    http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));

    const { result } = renderWebCrawl();

    act(() => {
      result.current.startCrawl({ url: 'https://example.com' });
    });

    await waitFor(() => expect(result.current.crawl?.id).toBe(CRAWL_ID));
    expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
      body: JSON.stringify({ url: 'https://example.com' }),
    });
  });

  it("surfaces the server's message when starting fails", async () => {
    http.post.mockRejectedValue(createHttpError('The URL is not reachable'));

    const { result } = renderWebCrawl();

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.startErrorMessage).toBe('The URL is not reachable'));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(http.get).not.toHaveBeenCalled();
    expect(result.current.crawl).toBeUndefined();
    expect(result.current.isStarting).toBe(false);
  });

  it('falls back to the error message when the failure carries no body', async () => {
    http.post.mockRejectedValue(new Error('Network down'));

    const { result } = renderWebCrawl();

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.startErrorMessage).toBe('Network down'));
  });

  it('keeps following the earlier crawl when starting another one fails', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(CRAWL_ID));
    const crawl = createWebCrawl({ status: 'completed' });
    http.get.mockResolvedValue(crawl);
    http.post.mockRejectedValue(createHttpError('Already crawling'));

    const { result } = renderWebCrawl();
    await waitFor(() => expect(result.current.crawl).toEqual(crawl));

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.startErrorMessage).toBe('Already crawling'));
    expect(result.current.crawl).toEqual(crawl);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(CRAWL_ID));
  });

  it('clears the start error once a later start succeeds', async () => {
    http.post.mockRejectedValueOnce(createHttpError('The URL is not reachable'));
    http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
    http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));

    const { result } = renderWebCrawl();

    act(() => {
      result.current.startCrawl(startRequest);
    });
    await waitFor(() => expect(result.current.startErrorMessage).toBe('The URL is not reachable'));

    act(() => {
      result.current.startCrawl(startRequest);
    });

    await waitFor(() => expect(result.current.crawl?.id).toBe(CRAWL_ID));
    expect(result.current.startErrorMessage).toBeUndefined();
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

    // react-query delivers a result shortly after its response resolved, so every check runs
    // this long after a poll was due
    const waitForInitialStatus = () => advance(SETTLE_MS);
    const advancePollInterval = () => advance(WEB_CRAWL_POLL_INTERVAL_MS);

    describe('of a stored crawl', () => {
      beforeEach(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(CRAWL_ID));
      });

      it('polls while the crawl is running and stops once it completed', async () => {
        http.get
          .mockResolvedValueOnce(createWebCrawl({ documentsCount: 1 }))
          .mockResolvedValueOnce(createWebCrawl({ documentsCount: 5 }))
          .mockResolvedValue(createWebCrawl({ status: 'completed', documentsCount: 9 }));

        const { result } = renderWebCrawl();

        await waitForInitialStatus();
        expect(result.current.crawl?.documentsCount).toBe(1);
        expect(http.get).toHaveBeenCalledTimes(1);

        await advancePollInterval();
        expect(result.current.crawl?.documentsCount).toBe(5);
        expect(http.get).toHaveBeenCalledTimes(2);

        await advancePollInterval();
        expect(result.current.crawl).toEqual(
          expect.objectContaining({ status: 'completed', documentsCount: 9 })
        );
        expect(http.get).toHaveBeenCalledTimes(3);

        await advancePollInterval();
        await advancePollInterval();
        expect(http.get).toHaveBeenCalledTimes(3);
      });

      it.each(['failed', 'canceled', 'completed'] as const)(
        'does not poll a crawl that is %s',
        async (status) => {
          http.get.mockResolvedValue(createWebCrawl({ status }));

          const { result } = renderWebCrawl();

          await waitForInitialStatus();
          expect(result.current.crawl?.status).toBe(status);

          await advancePollInterval();
          await advancePollInterval();
          expect(http.get).toHaveBeenCalledTimes(1);
        }
      );

      it('keeps polling a crawl that is stopping until it has wound down', async () => {
        http.get
          .mockResolvedValueOnce(createWebCrawl({ isStopping: true }))
          .mockResolvedValue(createWebCrawl({ status: 'canceled' }));

        const { result } = renderWebCrawl();

        await waitForInitialStatus();
        expect(result.current.crawl?.isStopping).toBe(true);

        await advancePollInterval();
        expect(result.current.crawl?.status).toBe('canceled');

        await advancePollInterval();
        expect(http.get).toHaveBeenCalledTimes(2);
      });

      it('does not poll a stored crawl that no longer exists', async () => {
        http.get.mockRejectedValue(createHttpError('Not found', 404));

        const { result } = renderWebCrawl();

        await waitForInitialStatus();
        await advancePollInterval();
        await advancePollInterval();

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(result.current.crawl).toBeUndefined();
      });

      it('stops polling when the hook unmounts', async () => {
        http.get.mockResolvedValue(createWebCrawl());

        const { unmount } = renderWebCrawl();
        await waitForInitialStatus();
        const callsBeforeUnmount = http.get.mock.calls.length;

        unmount();
        await advancePollInterval();
        await advancePollInterval();

        expect(http.get).toHaveBeenCalledTimes(callsBeforeUnmount);
      });
    });

    it('polls a crawl it just started until it finishes', async () => {
      http.post.mockResolvedValue(createWebCrawl());
      http.get
        .mockResolvedValueOnce(createWebCrawl({ documentsCount: 2 }))
        .mockResolvedValue(createWebCrawl({ status: 'completed', documentsCount: 6 }));

      const { result } = renderWebCrawl();

      act(() => {
        result.current.startCrawl(startRequest);
      });
      await advance(SETTLE_MS);
      expect(result.current.crawl?.status).toBe('running');

      await advancePollInterval();
      await advancePollInterval();
      expect(result.current.crawl).toEqual(
        expect.objectContaining({ status: 'completed', documentsCount: 6 })
      );
      const callsWhenFinished = http.get.mock.calls.length;

      await advancePollInterval();
      await advancePollInterval();
      expect(http.get).toHaveBeenCalledTimes(callsWhenFinished);
    });
  });
});
