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
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

export const renderWithProviders = (
  ui: React.ReactElement,
  core: ReturnType<typeof coreMock.createStart> = coreMock.createStart()
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

/** Fills the session, user, and agent id inputs rendered by `SessionScopeFields`. */
export const fillScope = (prefix: string) => {
  fireEvent.change(screen.getByTestId(`${prefix}-sessionId`), { target: { value: 's-1' } });
  fireEvent.change(screen.getByTestId(`${prefix}-userId`), { target: { value: 'u-1' } });
  fireEvent.change(screen.getByTestId(`${prefix}-agentId`), { target: { value: 'a-1' } });
};

export const pngFile = () =>
  new File([Uint8Array.from([137, 80, 78, 71])], 'pic.png', { type: 'image/png' });
