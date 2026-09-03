/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import {
  SOURCE_IMPROVEMENT_ACTIONS,
  WORKFLOW_IMPROVEMENT_ACTIONS,
} from '../../../../common/http_api/improvement_actions';
import { buildImprovement } from './improvement_test_fixtures';
import { ScopedImprovements } from './scoped_improvements';

const mockListImprovements = jest.fn();
const mockFeedbackLoopEnabled = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn(), addWarning: jest.fn() };

jest.mock('../../api/improvements', () => ({
  listImprovements: (...args: unknown[]) => mockListImprovements(...args),
  approveImprovement: jest.fn(),
  rejectImprovement: jest.fn(),
}));

jest.mock('../../hooks/use_feedback_loop_enabled', () => ({
  useFeedbackLoopEnabled: () => mockFeedbackLoopEnabled(),
}));

jest.mock('./signal_group_flyout', () => ({
  SignalGroupFlyout: ({ group }: { group: { tag: string } }) => (
    <div data-test-subj="contextSignalGroupFlyout">{group.tag}</div>
  ),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { http: {}, notifications: { toasts: mockToasts }, getChatOpener: () => jest.fn() },
  }),
}));

const aiIndex = { id: 'my-ai-index', sources: [], automations: [] } as unknown as GetAiIndexResponse;

const renderScoped = (actions: readonly string[] = SOURCE_IMPROVEMENT_ACTIONS) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ScopedImprovements
          aiIndex={aiIndex}
          actions={actions as typeof SOURCE_IMPROVEMENT_ACTIONS}
          data-test-subj="contextSourcesImprovements"
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFeedbackLoopEnabled.mockReturnValue(true);
  mockListImprovements.mockResolvedValue({
    items: [
      buildImprovement({
        improvement_id: 'src-1',
        action: 'add_source',
        title: 'Draw on the billing index',
        target: { subject: 'billing-*' },
      }),
      buildImprovement({
        improvement_id: 'wf-1',
        action: 'add_workflow',
        title: 'Summarise refund threads nightly',
        target: { subject: 'support-*' },
      }),
    ],
    total: 2,
  });
});

describe('ScopedImprovements', () => {
  it('shows only the suggestions that would change this panel', async () => {
    renderScoped(SOURCE_IMPROVEMENT_ACTIONS);

    expect(await screen.findByText('Draw on the billing index')).toBeInTheDocument();
    expect(screen.queryByText('Summarise refund threads nightly')).not.toBeInTheDocument();
  });

  it('shows the workflow suggestions when scoped to automations', async () => {
    renderScoped(WORKFLOW_IMPROVEMENT_ACTIONS);

    expect(await screen.findByText('Summarise refund threads nightly')).toBeInTheDocument();
    expect(screen.queryByText('Draw on the billing index')).not.toBeInTheDocument();
  });

  it('renders nothing when no suggestion applies, leaving the panel as it was', async () => {
    mockListImprovements.mockResolvedValue({ items: [], total: 0 });

    const { container } = renderScoped();

    // Nothing to await: an empty result must never flash a heading or a rule.
    expect(container).toBeEmptyDOMElement();
  });

  it('stays out of the way when the feedback loop is off', () => {
    mockFeedbackLoopEnabled.mockReturnValue(false);

    const { container } = renderScoped();

    expect(container).toBeEmptyDOMElement();
    expect(mockListImprovements).not.toHaveBeenCalled();
  });
});
