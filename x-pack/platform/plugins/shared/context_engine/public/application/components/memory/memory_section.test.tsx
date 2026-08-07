/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import {
  memoryApiPaths,
  type MemoryState,
  type MemoryStatusResponse,
} from '@kbn/agent-memory-common';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemorySection } from './memory_section';

const buildStatus = (
  state: MemoryState,
  overrides: Partial<MemoryStatusResponse> = {}
): MemoryStatusResponse => ({
  state,
  storage: {
    installed: state !== 'not_installed' && state !== 'unavailable',
    dataStreams: [],
  },
  maintenance: {
    enabled: state === 'ready',
    workflows: [
      { type: 'consolidation', installed: true, enabled: state === 'ready' },
      { type: 'conversation_scraper', installed: true, enabled: state === 'ready' },
      { type: 'gap_detection', installed: true, enabled: state === 'ready' },
    ],
  },
  capabilities: { canManage: true },
  ...overrides,
});

const renderSection = (core: CoreStart) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <MemorySection />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('MemorySection', () => {
  const createCore = (status: MemoryStatusResponse) => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path === memoryApiPaths.status) {
        return Promise.resolve(status);
      }
      if (path === memoryApiPaths.categories) {
        return Promise.resolve({ tree: [], uncategorized: [] });
      }
      return Promise.resolve({});
    });
    return core;
  };

  it('offers setup when memory has never been installed', async () => {
    renderSection(createCore(buildStatus('not_installed')));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemorySetupPrompt')).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextSetUpMemoryButton')).toBeInTheDocument();
  });

  it('hides the setup button from users who cannot manage memory', async () => {
    renderSection(createCore(buildStatus('not_installed', { capabilities: { canManage: false } })));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemorySetupPrompt')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextSetUpMemoryButton')).not.toBeInTheDocument();
  });

  it('explains why memory is unavailable rather than offering setup', async () => {
    renderSection(createCore(buildStatus('unavailable', { reason: 'plugin_disabled' })));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemoryUnavailable')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextSetUpMemoryButton')).not.toBeInTheDocument();
  });

  it('shows progress while memory is installing', async () => {
    renderSection(createCore(buildStatus('installing')));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemorySetupInProgress')).toBeInTheDocument();
    });
  });

  it('browses pages and shows curation controls once ready', async () => {
    renderSection(createCore(buildStatus('ready')));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemorySearch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextMemoryMaintenancePanel')).toBeInTheDocument();
    // No pages yet, so the table gives way to its empty state.
    expect(screen.getByTestId('contextMemoryEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextMemoryMaintenanceCallout')).not.toBeInTheDocument();
  });

  it('warns when curation jobs are off but memory is otherwise usable', async () => {
    renderSection(createCore(buildStatus('partially_ready')));

    await waitFor(() => {
      expect(screen.getByTestId('contextMemoryMaintenanceCallout')).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextMemorySearch')).toBeInTheDocument();
  });
});
