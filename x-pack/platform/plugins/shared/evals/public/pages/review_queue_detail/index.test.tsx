/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router, Route } from '@kbn/shared-ux-router';
import type { BlindReviewItem, RevealedReviewItem } from '@kbn/evals-common';
import { ReviewQueueDetailPage } from '.';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';
import {
  useNextReviewItem,
  useReviewQueue,
  useReviewQueueAgreement,
  useSubmitReviewVerdict,
  useTraceEvidence,
} from '../../hooks/use_review_queues_api';

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
jest.mock('../../hooks/use_review_queues_api');

const mockedPermissions = jest.mocked(useEvalsPermissions);
const mockedTraceFetcher = jest.mocked(useEvalsTraceFetcher);
const mockedQueue = jest.mocked(useReviewQueue);
const mockedNext = jest.mocked(useNextReviewItem);
const mockedSubmit = jest.mocked(useSubmitReviewVerdict);
const mockedEvidence = jest.mocked(useTraceEvidence);
const mockedAgreement = jest.mocked(useReviewQueueAgreement);

const blindItem: BlindReviewItem = {
  id: 'queue-1:0',
  queue_id: 'queue-1',
  status: 'pending',
  position: 0,
  source: { source: 'online', monitor_id: 'monitor-1', trace_id: 'trace-1' },
  evaluator: { name: 'correctness', version: '1.2.0' },
};

const revealedItem: RevealedReviewItem = {
  ...blindItem,
  status: 'reviewed',
  score: { label: 'fail', value: 0.12 },
  human: { label: 'pass', reviewed_at: '2026-07-03T14:00:00.000Z' },
};

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/review/queue-1'] });
  return render(
    <Router history={history}>
      <Route path="/review/:queueId" component={ReviewQueueDetailPage} />
    </Router>
  );
};

describe('ReviewQueueDetailPage', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPermissions.mockReturnValue({ canRead: true, canManage: true, canReview: true });
    mockedTraceFetcher.mockReturnValue(jest.fn());
    mockedQueue.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        id: 'queue-1',
        name: 'Weekly correctness spot-check',
        source_filter: { source: 'online', monitor_id: 'monitor-1' },
        evaluator_name: 'correctness',
        evaluator_version: '1.2.0',
        sample_size: 2,
        strategy: 'uniform',
        rubric: 'Pass only when the answer is fully supported by the retrieved context.',
        created_at: '2026-07-03T13:00:00.000Z',
        counts: { pending: 2, reviewed: 0, skipped: 0 },
      },
    } as unknown as ReturnType<typeof useReviewQueue>);
    mockedNext.mockReturnValue({
      isLoading: false,
      data: { item: blindItem },
      refetch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useNextReviewItem>);
    mockedEvidence.mockReturnValue({
      isLoading: false,
      data: {
        status: 'resolved',
        evidence: {
          input: { message: 'What is the capital of France?' },
          response: { message: 'Paris' },
          steps: [],
        },
      },
    } as unknown as ReturnType<typeof useTraceEvidence>);
    mockedAgreement.mockReturnValue({
      isLoading: false,
      data: undefined,
    } as unknown as ReturnType<typeof useReviewQueueAgreement>);
    mutate.mockImplementation((_vars, options) => options?.onSuccess?.({ item: revealedItem }));
    mockedSubmit.mockReturnValue({
      mutate,
      reset: jest.fn(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSubmitReviewVerdict>);
  });

  it('shows the rubric, input and output but not the judge verdict before submit', () => {
    renderPage();

    expect(screen.getByTestId('evalsReviewRubric')).toHaveTextContent(
      'Pass only when the answer is fully supported'
    );
    expect(screen.getByTestId('evalsReviewInput')).toHaveTextContent('capital of France');
    expect(screen.getByTestId('evalsReviewOutput')).toHaveTextContent('Paris');
    expect(screen.getByTestId('mockTraceWaterfall')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewRevealed')).not.toBeInTheDocument();
    expect(screen.queryByText('Judge verdict')).not.toBeInTheDocument();
    expect(screen.queryByText('Judge score')).not.toBeInTheDocument();
    expect(screen.queryByText('0.12')).not.toBeInTheDocument();
  });

  it('keeps submit disabled until a verdict is chosen', () => {
    renderPage();

    expect(screen.getByTestId('evalsReviewSubmit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('evalsReviewPass'));
    expect(screen.getByTestId('evalsReviewSubmit')).toBeEnabled();
  });

  it('reveals the judge verdict only after the verdict is submitted', async () => {
    renderPage();

    fireEvent.click(screen.getByTestId('evalsReviewPass'));
    fireEvent.change(screen.getByTestId('evalsReviewRationale'), {
      target: { value: 'Matches the context.' },
    });
    fireEvent.click(screen.getByTestId('evalsReviewSubmit'));

    expect(mutate).toHaveBeenCalledWith(
      { itemId: 'queue-1:0', verdict: { label: 'pass', rationale: 'Matches the context.' } },
      expect.any(Object)
    );
    const revealed = await screen.findByTestId('evalsReviewRevealed');
    expect(revealed).toHaveTextContent('Judge verdict');
    expect(revealed).toHaveTextContent('fail');
    expect(revealed).toHaveTextContent('0.12');
    expect(screen.getByText('The judge disagrees with you')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsReviewVerdictForm')).not.toBeInTheDocument();
  });

  it('does not offer the form without the review privilege', async () => {
    mockedPermissions.mockReturnValue({ canRead: true, canManage: true, canReview: false });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/does not allow submitting reviews/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('evalsReviewSubmit')).not.toBeInTheDocument();
  });

  it('shows the empty state when no pending items remain', () => {
    mockedNext.mockReturnValue({
      isLoading: false,
      data: { item: null },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useNextReviewItem>);
    renderPage();

    expect(screen.getByText('Nothing left to review')).toBeInTheDocument();
  });
});
