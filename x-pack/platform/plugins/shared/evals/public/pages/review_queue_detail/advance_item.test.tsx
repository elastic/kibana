/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router, Route } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { BlindReviewItem, GetNextReviewItemResponse } from '@kbn/evals-common';
import { ReviewQueueDetailPage } from '.';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
  reactRouterNavigate: jest.fn(() => ({})),
}));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div data-test-subj="mockTraceWaterfall" />,
  useTraceSpans: () => ({ spans: [], durationMs: 0, isLoading: false, error: undefined }),
}));
jest.mock('../../hooks/use_evals_permissions');
jest.mock('../../hooks/use_evals_api');

/**
 * These tests use the real review-queue hooks: the stale-item bug lives in how React Query
 * keeps `data` across a refetch, which a hook mock returning constants cannot reproduce.
 */

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), { request: {}, response: { status }, body: {} });

const blind = (position: number): BlindReviewItem => ({
  id: `queue-1:${position}`,
  queue_id: 'queue-1',
  status: 'pending',
  position,
  source: { source: 'online', monitor_id: 'monitor-1', trace_id: `trace-${position}` },
  evaluator: { name: 'correctness', version: '1.2.0' },
});

const itemA = blind(0);
const itemB = blind(1);

const queue = {
  id: 'queue-1',
  name: 'Weekly correctness spot-check',
  source_filter: { source: 'online', monitor_id: 'monitor-1' },
  evaluator_name: 'correctness',
  evaluator_version: '1.2.0',
  sample_size: 2,
  strategy: 'uniform',
  rubric: 'Pass only when supported.',
  created_at: '2026-07-03T13:00:00.000Z',
  counts: { pending: 2, reviewed: 0, skipped: 0 },
};

const submitUrlFor = (itemId: string) => `queue-1/items/${encodeURIComponent(itemId)}`;

describe('ReviewQueueDetailPage advancing to the next item', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  // One entry per `_next` request, in the order the page makes them.
  let nextResponses: Array<() => Promise<GetNextReviewItemResponse>>;

  const submittedItemIds = () => http.post.mock.calls.map(([url]) => url as string);
  const nextRequestCount = () =>
    http.get.mock.calls.filter(([url]) => (url as string).endsWith('/_next')).length;

  const renderPage = () => {
    const history = createMemoryHistory({ initialEntries: ['/review/queue-1'] });
    const queryClient = new QueryClient({
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route path="/review/:queueId" component={ReviewQueueDetailPage} />
        </Router>
      </QueryClientProvider>
    );
  };

  const expectNoEditableItem = () => {
    expect(screen.queryByTestId('evalsReviewVerdictForm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewSubmit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewSkip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewRevealed')).not.toBeInTheDocument();
  };

  const submitPass = async () => {
    fireEvent.click(await screen.findByTestId('evalsReviewPass'));
    fireEvent.click(screen.getByTestId('evalsReviewSubmit'));
  };

  const actions: Array<[string, () => Promise<void>]> = [
    [
      'Next',
      async () => {
        await submitPass();
        fireEvent.click(await screen.findByTestId('evalsReviewNext'));
      },
    ],
    [
      'Skip',
      async () => {
        fireEvent.click(await screen.findByTestId('evalsReviewSkip'));
      },
    ],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    nextResponses = [() => Promise.resolve({ item: itemA })];
    (jest.mocked(useKibana) as jest.Mock).mockReturnValue({ services: { http } });
    jest
      .mocked(useEvalsPermissions)
      .mockReturnValue({ canRead: true, canManage: true, canReview: true });
    jest.mocked(useEvalsTraceFetcher).mockReturnValue(jest.fn());

    http.get.mockImplementation((url: string) => {
      if (url.endsWith('/_next')) {
        const respond = nextResponses.shift();
        return respond ? respond() : Promise.reject(new Error('unexpected _next request'));
      }
      if (url.endsWith('/agreement')) {
        return Promise.reject(httpError(403));
      }
      if (url.endsWith('/evidence')) {
        return Promise.resolve({ status: 'unavailable' });
      }
      return Promise.resolve(queue);
    });
    http.post.mockImplementation((url: string) => {
      const reviewed = url.includes(encodeURIComponent(itemA.id)) ? itemA : itemB;
      return Promise.resolve({
        item: {
          ...reviewed,
          status: 'reviewed',
          score: { label: 'fail', value: 0.1 },
          human: { label: 'pass', reviewed_at: '2026-07-03T14:00:00.000Z' },
        },
      });
    });
  });

  describe.each(actions)('after %s', (_name, advance) => {
    it('never offers the previous item while the next one is loading', async () => {
      const held = deferred<GetNextReviewItemResponse>();
      nextResponses.push(() => held.promise);
      renderPage();

      await advance();
      await waitFor(() => expect(nextRequestCount()).toBe(2));

      expectNoEditableItem();
      expect(submittedItemIds()).toHaveLength(1);

      held.resolve({ item: itemB });
      fireEvent.click(await screen.findByTestId('evalsReviewPass'));
      fireEvent.click(screen.getByTestId('evalsReviewSubmit'));

      await waitFor(() => expect(submittedItemIds()).toHaveLength(2));
      expect(submittedItemIds()[1]).toContain(submitUrlFor(itemB.id));
    });

    it('shows a retry instead of the previous item when loading the next one fails', async () => {
      nextResponses.push(() => Promise.reject(httpError(400)));
      renderPage();

      await advance();

      expect(await screen.findByTestId('evalsReviewNextRetry')).toBeInTheDocument();
      expectNoEditableItem();
      expect(submittedItemIds()).toHaveLength(1);
    });

    it('offers only the new item once a retry succeeds', async () => {
      const retried = deferred<GetNextReviewItemResponse>();
      nextResponses.push(
        () => Promise.reject(httpError(400)),
        () => retried.promise
      );
      renderPage();

      await advance();
      fireEvent.click(await screen.findByTestId('evalsReviewNextRetry'));
      await waitFor(() => expect(nextRequestCount()).toBe(3));

      expectNoEditableItem();
      expect(screen.queryByTestId('evalsReviewNextRetry')).not.toBeInTheDocument();

      retried.resolve({ item: itemB });
      fireEvent.click(await screen.findByTestId('evalsReviewPass'));
      fireEvent.click(screen.getByTestId('evalsReviewSubmit'));

      await waitFor(() => expect(submittedItemIds()).toHaveLength(2));
      expect(submittedItemIds()[1]).toContain(submitUrlFor(itemB.id));
      expect(submittedItemIds()[1]).not.toContain(submitUrlFor(itemA.id));
    });

    it('shows the finished state when no item is left', async () => {
      nextResponses.push(() => Promise.resolve({ item: null }));
      renderPage();

      await advance();

      expect(await screen.findByText('Nothing left to review')).toBeInTheDocument();
      expectNoEditableItem();
    });
  });
});
