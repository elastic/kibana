/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { ViewKiPage } from './view_ki_page';

const mockUseKi = jest.fn();
const mockNavigateToContextEngine = jest.fn();
const mockCreateContextEngineUrl = jest.fn((path: string) => path);

jest.mock('../hooks/use_ki', () => ({
  useKi: (...args: unknown[]) => mockUseKi(...args),
}));

jest.mock('../hooks/use_navigation', () => ({
  useNavigation: () => ({
    createContextEngineUrl: mockCreateContextEngineUrl,
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
}));

const defaultKi: GetKiResponse = {
  id: 'ki-1',
  document: {
    title: 'Refund playbook',
    content: '# Hello',
    type: 'playbook',
  },
};

const renderViewKiPage = (initialEntry: string) => {
  const services = coreMock.createStart();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <ChromeServiceProvider value={{ chrome: services.chrome }}>
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <MemoryRouter initialEntries={[initialEntry]}>
                <Route path={CONTEXT_ENGINE_PATHS.viewKi} component={ViewKiPage} />
              </MemoryRouter>
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    </ChromeServiceProvider>
  );
};

describe('ViewKiPage', () => {
  beforeEach(() => {
    mockUseKi.mockReturnValue({
      ki: defaultKi,
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders missing index prompt when index query param is absent', () => {
    renderViewKiPage('/ai_index/sample-ki/ki/ki-1');

    expect(screen.getByTestId('contextViewKiMissingIndex')).toBeInTheDocument();
    expect(mockUseKi).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('renders error prompt when useKi returns an error', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiError')).toHaveTextContent('boom');
  });

  it('renders loading skeletons while useKi is loading', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: true,
      error: undefined,
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiTab-details')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiTab-document')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiContentLayout')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiContentLoading')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiMetadataLoading')).toBeInTheDocument();
  });

  it('renders document tab loading skeleton while useKi is loading', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: true,
      error: undefined,
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    fireEvent.click(screen.getByTestId('contextViewKiTab-document'));

    expect(screen.getByTestId('contextViewKiRawJsonLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentLayout')).not.toBeInTheDocument();
  });

  it('renders details tab by default and switches to raw JSON on document tab click', () => {
    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiContentLayout')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiRawJsonPanel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextViewKiTab-document'));

    expect(screen.getByTestId('contextViewKiRawJsonPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentLayout')).not.toBeInTheDocument();
  });

  it('renders type badge when document has a type', () => {
    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiTypeBadge')).toHaveTextContent('playbook');
  });

  it('renders deleted badge when lifecycle status is deleted', () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'deleted' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiDeletedBadge')).toHaveTextContent('deleted');
  });

  it('does not render deleted badge for active lifecycle', () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'active' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.queryByTestId('contextViewKiDeletedBadge')).not.toBeInTheDocument();
  });
});
