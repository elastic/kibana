/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ConnectorStatus } from '../common/types';
import type { ConnectorMemoryApi } from './api';
import { ConnectorMemoryApp } from './app';
import { ContextPanel } from './context_tab';

const status = (over: Partial<ConnectorStatus> = {}): ConnectorStatus => ({
  connectorId: 'drive-1',
  connectorType: '.google_drive',
  permissionScope: 'per_user',
  settings: {
    effective: {
      learn: 'reads',
      reach: 'area',
      area: { maxFiles: 100, maxDepth: 2 },
      summarizeReads: true,
    },
    customized: false,
  },
  documents: { visibleToYou: 40, total: 2492, byKind: { names: 2458, llm: 2 } },
  newestAt: '2026-11-03T18:14:21.980Z',
  crawlEnabled: true,
  schedule: null,
  ...over,
});

const render = (ui: React.ReactElement) =>
  renderWithI18n(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>
  );

describe('ContextPanel', () => {
  it('shows what the connector is set to learn and what is cached, and says each user’s files are their own', async () => {
    const getStatus = jest.fn().mockResolvedValue(status());
    render(
      <ContextPanel
        api={{ getStatus } as unknown as ConnectorMemoryApi}
        connectorId="drive-1"
        isReadOnly={false}
      />
    );

    const panel = await screen.findByTestId('connectorMemoryPanel');

    expect(getStatus).toHaveBeenCalledWith('drive-1');
    expect(screen.getByRole('radio', { name: /Direct hits plus area/ })).toBeChecked();
    expect(panel).toHaveTextContent(
      '2,492 files (40 visible to you) — 2,458 names only, 2 summaries'
    );
    expect(screen.getByTestId('connectorMemoryPerUserNote')).toBeInTheDocument();
  });

  it('shows the server’s message when the status cannot be read', async () => {
    const getStatus = jest
      .fn()
      .mockRejectedValue({ body: { message: 'Context Engine is disabled in this space.' } });
    render(
      <ContextPanel
        api={{ getStatus } as unknown as ConnectorMemoryApi}
        connectorId="drive-1"
        isReadOnly={false}
      />
    );

    expect(await screen.findByTestId('connectorMemoryPanelError')).toHaveTextContent(
      'Context Engine is disabled'
    );
  });
});

describe('the Connector memory page', () => {
  it('lists the connectors with what each learns and holds, or says there are none', async () => {
    const entry = {
      connectorId: 'drive-1',
      name: 'Team Drive',
      connectorType: '.google_drive',
      permissionScope: 'per_user',
      settings: status().settings.effective,
      customized: false,
      documents: 2492,
      schedule: { status: 'idle' },
    };
    const first = render(
      <ConnectorMemoryApp
        api={
          { listConnectors: jest.fn().mockResolvedValue([entry]) } as unknown as ConnectorMemoryApi
        }
      />
    );

    const table = await screen.findByTestId('connectorMemoryTable');
    expect(table).toHaveTextContent('Team Drive');
    expect(table).toHaveTextContent('Direct hits plus area');
    expect(table).toHaveTextContent('2,492');
    first.unmount();

    render(
      <ConnectorMemoryApp
        api={{ listConnectors: jest.fn().mockResolvedValue([]) } as unknown as ConnectorMemoryApi}
      />
    );
    expect(await screen.findByTestId('connectorMemoryEmpty')).toBeInTheDocument();
  });
});
