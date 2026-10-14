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
import { CONTEXT_ENGINE_PATHS, getViewKiPath } from '../paths';
import { ViewKiPage } from './view_ki_page';

const mockUseViewKi = jest.fn();
const mockNavigateToContextEngine = jest.fn();
const mockCreateContextEngineUrl = jest.fn((path: string) => path);

jest.mock('../hooks/use_view_ki', () => ({
  useViewKi: (...args: unknown[]) => mockUseViewKi(...args),
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
    mockUseViewKi.mockReturnValue({
      ki: defaultKi,
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves kiId from a path built with getViewKiPath when the id contains %', () => {
    renderViewKiPage(`${getViewKiPath('sample-ki', 'ki-1%2')}?index=ai-index-idx-sample-ki`);

    expect(mockUseViewKi).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'sample-ki',
        kiId: 'ki-1%2',
        index: 'ai-index-idx-sample-ki',
      })
    );
  });

  it('resolves kiId from a path built with getViewKiPath when the id contains a slash', () => {
    renderViewKiPage(`${getViewKiPath('sample-ki', 'a/b')}?index=ai-index-idx-sample-ki`);

    expect(mockUseViewKi).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'sample-ki',
        kiId: 'a/b',
        index: 'ai-index-idx-sample-ki',
      })
    );
  });

  it('does not crash when a KI id contains a literal %-escape-like substring', () => {
    renderViewKiPage(`${getViewKiPath('sample-ki', 'a%41b')}?index=ai-index-idx-sample-ki`);

    expect(mockUseViewKi).toHaveBeenCalled();
  });

  it('renders missing index prompt when index query param is absent', () => {
    renderViewKiPage('/ai_index/sample-ki/ki/ki-1');

    expect(screen.getByTestId('contextViewKiMissingIndex')).toBeInTheDocument();
    expect(mockUseViewKi).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('renders error prompt when useKi returns an error', () => {
    mockUseViewKi.mockReturnValue({
      ki: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiError')).toHaveTextContent('boom');
  });

  it('renders loading skeletons while useKi is loading', () => {
    mockUseViewKi.mockReturnValue({
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
    mockUseViewKi.mockReturnValue({
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
    mockUseViewKi.mockReturnValue({
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

    expect(screen.getByTestId('contextViewKiStatusBadge')).toHaveTextContent('deleted');
  });

  it('renders expired status badge when expires_at is in the past', () => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-06-15T12:00:00.000Z'));

    mockUseViewKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          expires_at: '2020-01-01T00:00:00.000Z',
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderViewKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiStatusBadge')).toHaveTextContent('expired');

    jest.useRealTimers();
  });

  it('does not render status badge for active lifecycle', () => {
    mockUseViewKi.mockReturnValue({
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

    expect(screen.queryByTestId('contextViewKiStatusBadge')).not.toBeInTheDocument();
  });
});
