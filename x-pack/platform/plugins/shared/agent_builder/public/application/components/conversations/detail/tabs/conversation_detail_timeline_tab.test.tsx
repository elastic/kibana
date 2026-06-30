/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import {
  ConversationDetailTimelineTab,
  getConversationTimelineEntries,
} from './conversation_detail_timeline_tab';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('ConversationDetailTimelineTab', () => {
  it('normalizes timeline metadata entries', () => {
    expect(
      getConversationTimelineEntries([
        {
          at: '2026-06-30T13:30:00.000Z',
          actor: 'workflow',
          source: 'workflow_hook',
          summary: 'State refreshed',
        },
      ])
    ).toEqual([
      {
        at: '2026-06-30T13:30:00.000Z',
        actor: 'workflow',
        metadata: {
          actor: 'workflow',
          at: '2026-06-30T13:30:00.000Z',
          source: 'workflow_hook',
          summary: 'State refreshed',
        },
        source: 'workflow_hook',
        summary: 'State refreshed',
      },
    ]);
  });

  it('renders timeline metadata with EUI timeline semantics', () => {
    renderWithProviders(
      <ConversationDetailTimelineTab
        timeline={[
          {
            at: '2026-06-30T13:30:00.000Z',
            actor: 'workflow',
            source: 'workflow_hook',
            summary: 'State refreshed',
          },
        ]}
      />
    );

    expect(screen.getByTestId('conversationDetailTimeline')).toBeInTheDocument();
    expect(screen.getByText('workflow')).toBeInTheDocument();
    expect(screen.getByText('workflow_hook')).toBeInTheDocument();
    expect(screen.getByText('State refreshed')).toBeInTheDocument();
  });

  it('renders an empty state when no timeline metadata exists', () => {
    renderWithProviders(<ConversationDetailTimelineTab timeline={[]} />);

    expect(screen.getByTestId('conversationDetailTimelineEmpty')).toBeInTheDocument();
    expect(screen.getByText('No timeline')).toBeInTheDocument();
  });
});
