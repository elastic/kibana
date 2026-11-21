/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Route } from '@kbn/shared-ux-router';
import type { ReviewQueueWithCounts } from '@kbn/evals-common';
import { ReviewQueuesListPage } from '.';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useReviewQueues } from '../../hooks/use_review_queues_api';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
  reactRouterNavigate: jest.fn(() => ({})),
}));
jest.mock('../../hooks/use_evals_permissions');
jest.mock('../../hooks/use_review_queues_api');

const queueWithVersion = (id: string, version: string): ReviewQueueWithCounts =>
  ({
    id,
    name: `Queue ${id}`,
    source_filter: { source: 'online', monitor_id: 'monitor-1' },
    evaluator_name: 'correctness',
    evaluator_version: version,
    sample_size: 2,
    strategy: 'uniform',
    rubric: '',
    created_at: '2026-07-03T13:00:00.000Z',
    counts: { pending: 2, reviewed: 0, skipped: 0 },
  } as unknown as ReviewQueueWithCounts);

describe('ReviewQueuesListPage', () => {
  beforeEach(() => {
    jest
      .mocked(useEvalsPermissions)
      .mockReturnValue({ canRead: true, canManage: true, canReview: true });
  });

  it('shows the evaluator version exactly as it was stored', () => {
    jest.mocked(useReviewQueues).mockReturnValue({
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      data: { queues: [queueWithVersion('a', 'latest'), queueWithVersion('b', 'v2.0.0')] },
    } as unknown as ReturnType<typeof useReviewQueues>);

    render(
      <I18nProvider>
        <Router history={createMemoryHistory({ initialEntries: ['/review'] })}>
          <Route path="/review" component={ReviewQueuesListPage} />
        </Router>
      </I18nProvider>
    );

    expect(screen.getByText('correctness (latest)')).toBeInTheDocument();
    expect(screen.getByText('correctness (v2.0.0)')).toBeInTheDocument();
    expect(screen.queryByText(/vlatest|vv2\.0\.0/)).not.toBeInTheDocument();
  });
});
