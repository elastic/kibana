/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { createStubInboxAction } from '../../../../common/test_helpers';
import { InboxHistoryFeed } from './inbox_history_feed';

jest.mock('@kbn/kibana-react-plugin/public');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (): FC<PropsWithChildren<{}>> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
};

describe('InboxHistoryFeed', () => {
  let httpGet: jest.Mock;

  beforeEach(() => {
    httpGet = jest.fn();
    useKibanaMock.mockReturnValue({
      services: { http: { get: httpGet } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders the empty-state prompt when the server returns no rows', async () => {
    httpGet.mockResolvedValueOnce({ actions: [], total: 0 });

    render(<InboxHistoryFeed />, { wrapper: createWrapper() });

    expect(await screen.findByText('No processed actions yet')).toBeInTheDocument();
  });

  it('renders one comment per processed action with the response payload', async () => {
    httpGet.mockResolvedValueOnce({
      actions: [
        createStubInboxAction({
          id: 'wf-1:run-1:step-1',
          status: 'approved',
          // Title and input_message intentionally differ so the assertions
          // can target each section without colliding (the title renders
          // inside the comment header, the prompt body in the comment body).
          title: 'Approve isolation of host-42',
          input_message: 'Should we isolate host-42?',
          responded_at: '2026-04-24T12:30:00.000Z',
          response_mode: 'responded',
          response_input: { approved: true, reason: 'looks good' },
          channel: null,
          source_app: 'workflows',
        }),
      ],
      total: 1,
    });

    render(<InboxHistoryFeed />, { wrapper: createWrapper() });

    expect(await screen.findByText('Approve isolation of host-42')).toBeInTheDocument();
    expect(screen.getByText('Should we isolate host-42?')).toBeInTheDocument();
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
    expect(screen.getByText(/"approved": true/)).toBeInTheDocument();
    // Default channel falls back to 'inbox' when the server hasn't yet
    // populated the channel field (kibana#256603 will fill it in).
    expect(screen.getByText('inbox')).toBeInTheDocument();
  });

  it('shows a "Processing…" badge for the responded-but-not-yet-resumed window from the server', async () => {
    // Source-of-truth window #1 from the audit feed mapper:
    // `respondedAt` is set on the step doc but the engine hasn't run
    // the resume yet, so `response_mode === 'responded'` while
    // `response_input` is still null. The mapper drives the UI off
    // these server fields — no client-side optimistic flag.
    httpGet.mockResolvedValueOnce({
      actions: [
        createStubInboxAction({
          id: 'wf-1:run-1:step-1',
          status: 'approved',
          title: 'Approve isolation of host-42?',
          responded_at: '2026-04-24T12:30:00.000Z',
          responded_by: 'alice',
          response_mode: 'responded',
          // Engine hasn't promoted `output` to `response_input` yet.
          response_input: null,
          source_app: 'workflows',
        }),
      ],
      total: 1,
    });

    render(<InboxHistoryFeed />, { wrapper: createWrapper() });

    expect(await screen.findByText('Processing…')).toBeInTheDocument();
  });

  it('drops the Processing badge once the server fills in response_input', async () => {
    // Source-of-truth window #2: Task Manager finished the resume,
    // engine wrote `finishedAt` + `output`, mapper surfaces
    // `response_input` from `output`. The badge transitions off without
    // the UI doing any local reconciliation.
    httpGet.mockResolvedValueOnce({
      actions: [
        createStubInboxAction({
          id: 'wf-1:run-1:step-1',
          status: 'approved',
          title: 'Approve isolation of host-42',
          response_mode: 'responded',
          response_input: { approved: true },
          source_app: 'workflows',
        }),
      ],
      total: 1,
    });

    render(<InboxHistoryFeed />, { wrapper: createWrapper() });

    expect(await screen.findByText('Approve isolation of host-42')).toBeInTheDocument();
    expect(screen.queryByText('Processing…')).not.toBeInTheDocument();
  });

  it('renders a timed-out badge when the response_mode reflects a timeout', async () => {
    httpGet.mockResolvedValueOnce({
      actions: [
        createStubInboxAction({
          id: 'wf-1:run-1:step-1',
          status: 'approved',
          response_mode: 'timed_out',
          responded_at: '2026-04-24T12:30:00.000Z',
          source_app: 'workflows',
        }),
      ],
      total: 1,
    });

    render(<InboxHistoryFeed />, { wrapper: createWrapper() });

    expect(await screen.findByText('Timed out')).toBeInTheDocument();
  });
});
