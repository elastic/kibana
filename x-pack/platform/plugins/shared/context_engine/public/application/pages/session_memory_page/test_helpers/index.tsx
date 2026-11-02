/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { SessionContext } from '../session_context';
import type { SessionContextValue } from '../session_context';

export const buildSessionContext = (
  overrides: Partial<SessionContextValue> = {}
): SessionContextValue => ({
  userId: 'kathleen',
  spaceId: 'default',
  sessionId: 'session-1',
  setSessionId: jest.fn(),
  newSession: jest.fn(),
  agentId: 'elastic-agent',
  setAgentId: jest.fn(),
  aiIndexIds: [],
  setAiIndexIds: jest.fn(),
  ...overrides,
});

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    core = coreMock.createStart(),
    session = buildSessionContext(),
  }: { core?: ReturnType<typeof coreMock.createStart>; session?: SessionContextValue } = {}
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>
            <SessionContext.Provider value={session}>{ui}</SessionContext.Provider>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

export const pngFile = () =>
  new File([Uint8Array.from([137, 80, 78, 71])], 'pic.png', { type: 'image/png' });

export const pdfFile = () => new File(['%PDF'], 'deck.pdf', { type: 'application/pdf' });
