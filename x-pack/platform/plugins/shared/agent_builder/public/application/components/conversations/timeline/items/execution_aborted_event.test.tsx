/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EventActorType, type ExecutionAbortReason } from '@kbn/agent-builder-common';
import { ExecutionAbortedEvent } from './execution_aborted_event';
import { createExecutionAbortedEvent } from './execution_aborted_event.factory';

const renderEvent = (abortedBy?: ExecutionAbortReason) =>
  render(
    <I18nProvider>
      <ExecutionAbortedEvent
        event={createExecutionAbortedEvent({
          data: { time_to_last_token: 600, ...(abortedBy ? { aborted_by: abortedBy } : {}) },
        })}
      />
    </I18nProvider>
  );

describe('ExecutionAbortedEvent', () => {
  it('shows the full name', () => {
    renderEvent({
      source: 'api',
      actor: {
        type: EventActorType.user,
        id: 'user-1',
        username: 'test_user',
        full_name: 'Test User',
      },
    });

    expect(screen.getByText('Response stopped by Test User')).toBeInTheDocument();
  });

  it('falls back to the stored username, then the id', () => {
    const { unmount } = renderEvent({
      source: 'api',
      actor: { type: EventActorType.user, id: 'user-1', username: 'jdoe' },
    });
    expect(screen.getByText('Response stopped by jdoe')).toBeInTheDocument();
    unmount();

    renderEvent({ source: 'api', actor: { type: EventActorType.user, id: 'user-1' } });
    expect(screen.getByText('Response stopped by user-1')).toBeInTheDocument();
  });

  it('shows a plain message without an actor', () => {
    renderEvent({ source: 'task_manager' });

    expect(screen.getByText('Response stopped')).toBeInTheDocument();
  });
});
