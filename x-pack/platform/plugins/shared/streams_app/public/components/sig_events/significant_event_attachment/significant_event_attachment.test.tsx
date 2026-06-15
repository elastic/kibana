/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject, EMPTY } from 'rxjs';
import type { SignificantEventAttachment } from '@kbn/streams-plugin/common';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/streams-plugin/common';
import { FocusedSignificantEventService } from '../../../services/significant_events/focused_significant_event_service';
import {
  registerSignificantEventAttachment,
  significantEventAttachmentDefinition,
} from './significant_event_attachment';

const attachment: SignificantEventAttachment = {
  id: 'attachment-1',
  type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  data: {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    event_id: 'event-1',
    discovery_slug: 'payment-outage',
    status: 'promoted',
    stream_names: ['logs.payment'],
    title: 'Payment outage',
    summary: 'Payments are failing.',
    root_cause: 'Payment gateway timeout.',
    criticality: 90,
    confidence: 0.8,
    impact: 'high',
    recommendations: ['Restart gateway client'],
  },
};

describe('significantEventAttachmentDefinition', () => {
  it('registers the attachment renderer', () => {
    const addAttachmentType = jest.fn();
    const cleanup = registerSignificantEventAttachment({
      agentBuilder: {
        addAttachment: jest.fn(),
        attachments: { addAttachmentType },
        events: {
          ui: { activeConversation$: new BehaviorSubject(null).asObservable() },
          getChatEvents$: jest.fn(() => EMPTY),
        },
      } as never,
      chrome: {
        sidebar: { getCurrentAppId$: () => new BehaviorSubject(null).asObservable() },
      } as never,
      focusedSignificantEventService: new FocusedSignificantEventService(),
    });

    cleanup();

    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
      significantEventAttachmentDefinition
    );
  });

  it('renders an inline significant event card', () => {
    render(
      <I18nProvider>
        <>
          {significantEventAttachmentDefinition.renderInlineContent?.({
            attachment,
            isSidebar: false,
          })}
        </>
      </I18nProvider>
    );

    expect(screen.getByText('Payment outage')).toBeInTheDocument();
    expect(screen.getByText('Payments are failing.')).toBeInTheDocument();
    expect(screen.getByText('Payment gateway timeout.')).toBeInTheDocument();
    expect(screen.getByText('logs.payment')).toBeInTheDocument();
  });
});
