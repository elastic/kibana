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
          actor: 'incident commander',
          source: 'incident',
          summary: 'Mitigation started',
        },
      ])
    ).toEqual([
      {
        at: '2026-06-30T13:30:00.000Z',
        actor: 'incident commander',
        metadata: {
          actor: 'incident commander',
          at: '2026-06-30T13:30:00.000Z',
          source: 'incident',
          summary: 'Mitigation started',
        },
        source: 'incident',
        summary: 'Mitigation started',
      },
    ]);
  });

  it('renders timeline metadata with EUI timeline semantics', () => {
    renderWithProviders(
      <ConversationDetailTimelineTab
        timeline={[
          {
            at: '2026-06-30T13:30:00.000Z',
            actor: 'incident commander',
            source: 'incident',
            summary: 'Mitigation started',
          },
        ]}
      />
    );

    expect(screen.getByTestId('conversationDetailTimeline')).toBeInTheDocument();
    expect(screen.getByText('incident commander')).toBeInTheDocument();
    expect(screen.getByText('incident')).toBeInTheDocument();
    expect(screen.getByText('Mitigation started')).toBeInTheDocument();
  });

  it('renders an empty state when no timeline metadata exists', () => {
    renderWithProviders(<ConversationDetailTimelineTab timeline={[]} />);

    expect(screen.getByTestId('conversationDetailTimelineEmpty')).toBeInTheDocument();
    expect(screen.getByText('No timeline')).toBeInTheDocument();
  });
});
