/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { createAppChromeMock } from '../../test_utils/app_chrome_mock';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AiIndexOnboardingPanel } from './ai_index_onboarding_panel';

const renderWithProviders = (core: CoreStart) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            ...core,
            history: scopedHistoryMock.create(),
            appChrome: createAppChromeMock(),
          }}
        >
          <AiIndexOnboardingPanel />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('AiIndexOnboardingPanel', () => {
  it('renders onboarding copy and the create action', () => {
    const core = coreMock.createStart();
    core.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );

    renderWithProviders(core);

    expect(screen.getByTestId('contextAiIndexOnboarding')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexOnboardingIllustration')).toBeInTheDocument();
    expect(screen.getByText('Get started with Context')).toBeInTheDocument();
    expect(
      screen.getByText(/An AI Index turns your data into knowledge your agents can retrieve/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAiIndexButton')).toHaveTextContent('Create AI Index');
  });
});
