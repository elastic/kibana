/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../../common/features';
import { useMemoryEnabled } from '../../hooks/use_memory_enabled';
import { createAppChromeMock } from '../../test_utils/app_chrome_mock';
import { SessionMemoryPage } from './session_memory_page';

jest.mock('../../hooks/use_memory_enabled', () => ({ useMemoryEnabled: jest.fn() }));
jest.mock('../../hooks/use_session_memory_mutations', () => ({
  useRememberSessionMemory: () => ({ mutate: jest.fn(), isLoading: false }),
  useSearchSessionMemory: () => ({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => ({
    agents: [{ id: 'elastic-agent', name: 'Elastic' }],
    isLoading: false,
    error: undefined,
  }),
}));
jest.mock('./use_ai_index_options', () => ({
  useAiIndexOptions: () => ({
    options: [{ label: 'support', value: 'support' }],
    isLoading: false,
  }),
}));

const mockUseMemoryEnabled = jest.mocked(useMemoryEnabled);

const renderPage = () => {
  const core = coreMock.createStart();
  core.security.authc.getCurrentUser.mockResolvedValue({ username: 'kathleen' } as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MockAppHeaderProvider>
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider
            services={{
              ...core,
              history: scopedHistoryMock.create(),
              appChrome: createAppChromeMock(),
            }}
          >
            <QueryClientProvider client={queryClient}>
              <MemoryRouter>
                <SessionMemoryPage />
              </MemoryRouter>
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    </MockAppHeaderProvider>
  );
  return core;
};

describe('SessionMemoryPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the context bar, panels, and nav tabs when memory is enabled', () => {
    mockUseMemoryEnabled.mockReturnValue(true);
    renderPage();

    expect(screen.getByTestId('contextSessionContextBar')).toBeInTheDocument();
    expect(screen.getByTestId('contextSessionMemoryRememberPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextSessionMemorySearchPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextLandingTab-session_memory')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSessionMemoryDisabled')).not.toBeInTheDocument();
  });

  it('infers the user from the Kibana session and generates a session id', async () => {
    mockUseMemoryEnabled.mockReturnValue(true);
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('contextSessionContextUser')).toHaveTextContent('kathleen')
    );
    expect(
      (screen.getByTestId('contextSessionContextSessionId') as HTMLInputElement).value
    ).toMatch(/^session-[0-9a-f]{8}$/);
  });

  it('navigates back to the AI indices tab', () => {
    mockUseMemoryEnabled.mockReturnValue(true);
    const core = renderPage();

    fireEvent.click(screen.getByTestId('contextLandingTab-ai_indices'));

    expect(core.application.navigateToApp).toHaveBeenCalledWith(CONTEXT_ENGINE_APP_ID, {
      path: '/',
    });
  });

  it('renders the disabled prompt without panels or tabs when memory is off', () => {
    mockUseMemoryEnabled.mockReturnValue(false);
    renderPage();

    expect(screen.getByTestId('contextSessionMemoryDisabled')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSessionMemoryRememberPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextLandingTab-session_memory')).not.toBeInTheDocument();
  });
});
