/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router, Route } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReviewQueuesListPage } from './review_queues_list';
import { ReviewQueueDetailPage } from './review_queue_detail';
import { useEvalsPermissions } from '../hooks/use_evals_permissions';
import { useEvalsTraceFetcher } from '../hooks/use_evals_api';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
  reactRouterNavigate: jest.fn(() => ({})),
}));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div data-test-subj="mockTraceWaterfall" />,
  useTraceSpans: () => ({ spans: [], durationMs: 0, isLoading: false, error: undefined }),
}));
jest.mock('../hooks/use_evals_permissions');
jest.mock('../hooks/use_evals_api');

/**
 * A user with the read privilege but not the review privilege can still open a review URL
 * directly. The server answers every review route with 403 for them, so the pages must explain
 * that instead of firing requests that can only fail and show a generic load error.
 */
describe('review pages without the review privilege', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  const forbidden = Object.assign(new Error('Forbidden'), {
    request: {},
    response: { status: 403 },
    body: { statusCode: 403 },
  });

  const renderAt = (path: string) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    const queryClient = new QueryClient({
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route exact path="/review" component={ReviewQueuesListPage} />
          <Route path="/review/:queueId" component={ReviewQueueDetailPage} />
        </Router>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jest.mocked(useKibana) as jest.Mock).mockReturnValue({ services: { http } });
    jest.mocked(useEvalsTraceFetcher).mockReturnValue(jest.fn());
    jest
      .mocked(useEvalsPermissions)
      .mockReturnValue({ canRead: true, canManage: false, canReview: false });
    http.get.mockRejectedValue(forbidden);
    http.post.mockRejectedValue(forbidden);
  });

  it.each([
    ['list', '/review'],
    ['detail', '/review/queue-1'],
  ])('explains the missing privilege on the %s URL and fires no request', async (_name, path) => {
    renderAt(path);

    expect(await screen.findByTestId('evalsReviewNoPrivilege')).toHaveTextContent(
      /requires the evals "All" privilege/
    );
    expect(screen.queryByText('Unable to load review queues')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewQueueRetry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewQueuesRetry')).not.toBeInTheDocument();
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });
});
