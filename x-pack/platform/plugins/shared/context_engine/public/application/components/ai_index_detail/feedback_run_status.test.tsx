/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AiIndexFeedbackRun } from '../../../../common/http_api/ai_indices';
import { FEEDBACK_RUN_STALE_AFTER_MS } from '../../../../common/http_api/ai_indices';
import { FeedbackRunStatus } from './feedback_run_status';

const renderStatus = (
  run: AiIndexFeedbackRun | undefined,
  onOpenConversation?: (conversationId: string) => void
) =>
  render(
    <I18nProvider>
      <FeedbackRunStatus run={run} onOpenConversation={onOpenConversation} />
    </I18nProvider>
  );

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

describe('FeedbackRunStatus', () => {
  it('says nothing until an analysis has run', () => {
    renderStatus(undefined);

    expect(screen.queryByTestId('contextFeedbackRunStatus')).not.toBeInTheDocument();
  });

  it('reports a run that has started but not finished as in progress', () => {
    renderStatus({ conversation_id: 'conv-1', started_at: minutesAgo(2) });

    expect(screen.getByTestId('contextFeedbackRunStatusText')).toHaveTextContent('Analyzing');
  });

  it('reports what the last run proposed once it finished', () => {
    renderStatus({
      conversation_id: 'conv-1',
      started_at: minutesAgo(10),
      finished_at: minutesAgo(9),
      recorded: 2,
    });

    expect(screen.getByTestId('contextFeedbackRunStatusText')).toHaveTextContent('2 changes');
  });

  it('distinguishes a run that proposed nothing from one that is still going', () => {
    renderStatus({
      conversation_id: 'conv-1',
      started_at: minutesAgo(10),
      finished_at: minutesAgo(9),
      recorded: 0,
    });

    expect(screen.getByTestId('contextFeedbackRunStatusText')).toHaveTextContent('no changes');
  });

  it('stops claiming a run is going once it has been quiet longer than the step can take', () => {
    renderStatus({
      conversation_id: 'conv-1',
      started_at: new Date(Date.now() - FEEDBACK_RUN_STALE_AFTER_MS - 60_000).toISOString(),
    });

    expect(screen.getByTestId('contextFeedbackRunStatusText')).toHaveTextContent(
      'stopped without finishing'
    );
  });

  it('opens the conversation the run is writing into', () => {
    const onOpenConversation = jest.fn();
    renderStatus({ conversation_id: 'conv-1', started_at: minutesAgo(2) }, onOpenConversation);

    fireEvent.click(screen.getByTestId('contextFeedbackRunOpenConversationButton'));

    expect(onOpenConversation).toHaveBeenCalledWith('conv-1');
  });

  it('offers no way in when there is no chat to open it in', () => {
    renderStatus({ conversation_id: 'conv-1', started_at: minutesAgo(2) });

    expect(
      screen.queryByTestId('contextFeedbackRunOpenConversationButton')
    ).not.toBeInTheDocument();
  });
});
