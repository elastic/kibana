/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import { EventActorType } from '@kbn/agent-builder-common';
import {
  INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  type InvestigationRunFailedEventData,
} from '../../../common/investigations/run_failure';
import { investigationRunFailedEventUiDefinition } from './run_failed_event';
import { registerInvestigationConversationEventUiDefinitions } from '.';

const event: ConversationEvent<
  typeof INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  InvestigationRunFailedEventData
> = {
  id: 'failure-1',
  created_at: '2026-01-01T00:00:00.000Z',
  type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  actor: { type: EventActorType.user, id: 'workflow-user' },
  data: {
    execution_id: 'exec-1',
    request: 'Why is checkout slow?\nCheck <script>alert(1)</script>',
    reason: 'Permission denied\nMissing <manage> privilege',
  },
};

const renderEvent = (storedEvent = event) =>
  render(
    <I18nProvider>
      {investigationRunFailedEventUiDefinition.render(storedEvent, { conversationId: 'inv-1' })}
    </I18nProvider>
  );

describe('investigation run failure event', () => {
  it('renders the persisted request and failure as text, including line breaks', () => {
    const { container } = renderEvent();

    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('Failure reason')).toBeInTheDocument();
    expect(screen.getByTestId('investigationRunFailedRequest').textContent).toBe(
      event.data.request
    );
    expect(screen.getByTestId('investigationRunFailedReason').textContent).toBe(event.data.reason);
    expect(screen.getByTestId('investigationRunFailedRequest')).toHaveStyleRule(
      'white-space',
      'pre-wrap'
    );
    expect(screen.getByTestId('investigationRunFailedReason')).toHaveStyleRule(
      'overflow-wrap',
      'anywhere'
    );
    expect(container.querySelector('script, manage')).toBeNull();
  });

  it('shows an unavailable request without hiding the reason', () => {
    renderEvent({ ...event, data: { execution_id: 'exec-1', reason: 'Permission denied' } });

    expect(screen.getByText('Original request unavailable.')).toBeInTheDocument();
    expect(screen.getByTestId('investigationRunFailedReason')).toHaveTextContent(
      'Permission denied'
    );
  });

  it('registers a warning event with the shared investigation timeline renderers', () => {
    const register = jest.fn();
    registerInvestigationConversationEventUiDefinitions({ register } as never);

    expect(register).toHaveBeenCalledWith(investigationRunFailedEventUiDefinition);
    expect(
      investigationRunFailedEventUiDefinition.getHeader?.(event, { conversationId: 'inv-1' })
    ).toMatchObject({ icon: 'warning', label: 'Investigation run failed' });
  });
});
