/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ,
  ContextEngineSubPageHeader,
} from './context_engine_page_header';

const renderHeader = (services: ReturnType<typeof coreMock.createStart>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...services, history: scopedHistoryMock.create() }}>
          <ContextEngineSubPageHeader
            backLabel="Cancel"
            backHref="/app/context_engine/"
            onBackClick={jest.fn()}
            pageTitle="Create AI index"
          />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('ContextEngineSubPageHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hides the in-page back button when Chrome Next is enabled in the project layout', () => {
    const services = coreMock.createStart();
    services.chrome.next.isEnabled = true;
    services.chrome.getChromeStyle.mockReturnValue('project');

    renderHeader(services);

    expect(screen.queryByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ)).not.toBeInTheDocument();
    expect(screen.getByText('Create AI index')).toBeInTheDocument();
  });

  it('shows the in-page back button in classic layout when Chrome Next is enabled', () => {
    const services = coreMock.createStart();
    services.chrome.next.isEnabled = true;
    services.chrome.getChromeStyle.mockReturnValue('classic');

    renderHeader(services);

    expect(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ)).toBeInTheDocument();
  });

  it('shows the in-page back button in the project layout when Chrome Next is disabled', () => {
    const services = coreMock.createStart();
    services.chrome.next.isEnabled = false;
    services.chrome.getChromeStyle.mockReturnValue('project');

    renderHeader(services);

    expect(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ)).toBeInTheDocument();
  });
});
