/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ContextEngineSubPageHeader } from './context_engine_page_header';

const renderHeader = (services: ReturnType<typeof coreMock.createStart>) =>
  render(
    <MockAppHeaderProvider chrome={services.chrome}>
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
    </MockAppHeaderProvider>
  );

describe('ContextEngineSubPageHeader', () => {
  let services: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    services = coreMock.createStart();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the app header title and back control', () => {
    renderHeader(services);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Create AI index');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('registers the inline app header slot', () => {
    renderHeader(services);

    expect(services.chrome.inlineAppHeader.register).toHaveBeenCalledWith('Create AI index');
  });
});
