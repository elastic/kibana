/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { ImprovementAction } from '../../../../common/http_api/improvement_actions';
import { buildImprovement } from './improvement_test_fixtures';
import { ScopedImprovements } from './scoped_improvements';

const mockListImprovements = jest.fn();
const mockApproveImprovement = jest.fn();
const mockRejectImprovement = jest.fn();
const mockFeedbackLoopEnabled = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn(), addWarning: jest.fn() };

jest.mock('../../api/improvements', () => ({
  listImprovements: (...args: unknown[]) => mockListImprovements(...args),
  approveImprovement: (...args: unknown[]) => mockApproveImprovement(...args),
  rejectImprovement: (...args: unknown[]) => mockRejectImprovement(...args),
}));

jest.mock('../../hooks/use_feedback_loop_enabled', () => ({
  useFeedbackLoopEnabled: () => mockFeedbackLoopEnabled(),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: { toasts: mockToasts },
      getChatOpener: () => undefined,
    },
  }),
}));

const SOURCE_ACTIONS: readonly ImprovementAction[] = ['add_source', 'edit_source', 'remove_source'];

const aiIndex = { id: 'my-ai-index' } as GetAiIndexResponse;

const addSource = buildImprovement({
  improvement_id: 'imp-source',
  action: 'add_source',
  title: 'Index the returns policy',
  payload: { source: { type: 'esql', value: 'FROM returns-policy' } },
});

const addWorkflow = buildImprovement({
  improvement_id: 'imp-workflow',
  action: 'add_workflow',
  title: 'Refresh the policy KIs nightly',
  payload: { workflow_yaml: 'version: "1"' },
});

const renderScoped = (actions = SOURCE_ACTIONS) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ScopedImprovements
          aiIndex={aiIndex}
          actions={actions}
          data-test-subj="contextAiIndexSourceImprovements"
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('ScopedImprovements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedbackLoopEnabled.mockReturnValue(true);
    mockListImprovements.mockImplementation((_http, { status }) => {
      // History queries (applied/rejected) return empty; active suggestion queries return fixtures.
      const isHistory =
        Array.isArray(status) && status.every((s: string) => s === 'applied' || s === 'rejected');
      return Promise.resolve(
        isHistory ? { items: [], total: 0 } : { items: [addSource, addWorkflow], total: 2 }
      );
    });
    mockRejectImprovement.mockResolvedValue({ improvement: addSource });
    mockApproveImprovement.mockResolvedValue({ improvement: addSource });
  });

  it('shows only the suggestions that would change this part of the index', async () => {
    renderScoped();

    expect(await screen.findByText('Index the returns policy')).toBeInTheDocument();
    expect(screen.queryByText('Refresh the policy KIs nightly')).not.toBeInTheDocument();
  });

  it('renders nothing when no suggestion belongs here', async () => {
    mockListImprovements.mockResolvedValue({ items: [addWorkflow], total: 1 });

    renderScoped();

    await waitFor(() => expect(mockListImprovements).toHaveBeenCalled());

    expect(screen.queryByTestId('contextAiIndexSourceImprovements')).not.toBeInTheDocument();
  });

  it('applies nothing until the suggestion is approved', async () => {
    renderScoped();

    await screen.findByText('Index the returns policy');

    expect(mockApproveImprovement).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('contextImprovementApproveButton'));

    await waitFor(() =>
      expect(mockApproveImprovement).toHaveBeenCalledWith(
        {},
        { aiIndexId: 'my-ai-index', improvementId: 'imp-source' }
      )
    );
  });

  describe('rejecting', () => {
    it('asks why before recording anything', async () => {
      renderScoped();

      await screen.findByText('Index the returns policy');
      fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));

      expect(await screen.findByTestId('contextImprovementRejectModal')).toBeInTheDocument();
      expect(mockRejectImprovement).not.toHaveBeenCalled();
    });

    it('records the reason with the rejection', async () => {
      renderScoped();

      await screen.findByText('Index the returns policy');
      fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));

      fireEvent.change(await screen.findByTestId('contextImprovementRejectReasonInput'), {
        target: { value: 'That index is being retired.' },
      });
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() =>
        expect(mockRejectImprovement).toHaveBeenCalledWith(
          {},
          {
            aiIndexId: 'my-ai-index',
            improvementId: 'imp-source',
            reason: 'That index is being retired.',
          }
        )
      );
    });

    it('rejects without a reason rather than insisting on one', async () => {
      renderScoped();

      await screen.findByText('Index the returns policy');
      fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));
      fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() =>
        expect(mockRejectImprovement).toHaveBeenCalledWith(
          {},
          { aiIndexId: 'my-ai-index', improvementId: 'imp-source', reason: undefined }
        )
      );
    });

    it('sends no reason for whitespace, which would teach later runs nothing', async () => {
      renderScoped();

      await screen.findByText('Index the returns policy');
      fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));

      fireEvent.change(await screen.findByTestId('contextImprovementRejectReasonInput'), {
        target: { value: '   ' },
      });
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() =>
        expect(mockRejectImprovement).toHaveBeenCalledWith(
          {},
          { aiIndexId: 'my-ai-index', improvementId: 'imp-source', reason: undefined }
        )
      );
    });

    it('keeps the suggestion when the prompt is dismissed', async () => {
      renderScoped();

      await screen.findByText('Index the returns policy');
      fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));
      fireEvent.click(await screen.findByTestId('confirmModalCancelButton'));

      await waitFor(() =>
        expect(screen.queryByTestId('contextImprovementRejectModal')).not.toBeInTheDocument()
      );
      expect(mockRejectImprovement).not.toHaveBeenCalled();
      expect(screen.getByText('Index the returns policy')).toBeInTheDocument();
    });
  });

  it('shows nothing while the feedback loop is off', async () => {
    mockFeedbackLoopEnabled.mockReturnValue(false);

    renderScoped();

    await waitFor(() => expect(mockListImprovements).not.toHaveBeenCalled());
    expect(screen.queryByTestId('contextAiIndexSourceImprovements')).not.toBeInTheDocument();
  });
});
