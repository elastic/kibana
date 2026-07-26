/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';

import type { ResponseError } from '../../../../common/types';
import { EsDeprecations } from './es_deprecations';
import { mockEsDeprecations } from './__fixtures__/es_deprecations';

const mockBreadcrumbsSetBreadcrumbs = jest.fn();

const mockUseLoadEsDeprecations = jest.fn();
const mockUseLoadRemoteClusters = jest.fn();

jest.mock('../../app_context', () => {
  const actual = jest.requireActual('../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      plugins: {
        share: {
          url: {
            locators: {
              get: () => ({
                useUrl: () => '/app/management/data/remote_clusters',
              }),
            },
          },
        },
      },
      services: {
        api: {
          useLoadEsDeprecations: () => mockUseLoadEsDeprecations(),
          useLoadRemoteClusters: () => mockUseLoadRemoteClusters(),
        },
        breadcrumbs: {
          setBreadcrumbs: mockBreadcrumbsSetBreadcrumbs,
        },
        core: {
          docLinks: {
            links: {
              upgradeAssistant: {
                batchReindex: 'https://example.invalid/batch-reindex',
              },
            },
          },
        },
      },
    }),
  };
});

jest.mock('./es_deprecations_table', () => ({
  EsDeprecationsTable: () => <div data-test-subj="esDeprecationsTableStub" />,
}));

describe('EsDeprecations', () => {
  const renderPage = () => {
    const history = createMemoryHistory();
    return renderWithI18n(
      <Router history={history}>
        <EsDeprecations />
      </Router>
    );
  };

  beforeEach(() => {
    mockBreadcrumbsSetBreadcrumbs.mockClear();
    mockUseLoadEsDeprecations.mockReset();
    mockUseLoadRemoteClusters.mockReset();
  });

  it('shows loading state', () => {
    mockUseLoadEsDeprecations.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(screen.getByText('Loading deprecation issues…')).toBeInTheDocument();
  });

  it('shows no deprecations prompt', async () => {
    mockUseLoadEsDeprecations.mockReturnValue({
      data: { ...mockEsDeprecations, migrationsDeprecations: [], totalCriticalDeprecations: 0 },
      isLoading: false,
      error: undefined,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('noDeprecationsPrompt')).toBeInTheDocument();
  });

  it('renders remote clusters callout', async () => {
    mockUseLoadEsDeprecations.mockReturnValue({
      data: mockEsDeprecations,
      isLoading: false,
      error: undefined,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: ['test_remote_cluster'] });

    renderPage();

    expect(await screen.findByTestId('remoteClustersWarningCallout')).toBeInTheDocument();
    expect(screen.getByTestId('remoteClustersLink')).toHaveAttribute(
      'href',
      '/app/management/data/remote_clusters'
    );
  });

  it('shows critical and warning deprecations count', async () => {
    mockUseLoadEsDeprecations.mockReturnValue({
      data: mockEsDeprecations,
      isLoading: false,
      error: undefined,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('criticalDeprecationsCount')).toHaveTextContent('Critical: 2');
    expect(screen.getByTestId('warningDeprecationsCount')).toHaveTextContent('Warning: 3');
  });

  it('handles 403', async () => {
    const error: ResponseError = {
      statusCode: 403,
      message: 'Forbidden',
    };

    mockUseLoadEsDeprecations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'You are not authorized to view Elasticsearch deprecation issues.'
    );
  });

  it('shows upgraded message when all nodes have been upgraded', async () => {
    const error: ResponseError = {
      statusCode: 426,
      message: 'There are some nodes running a different version of Elasticsearch',
      attributes: {
        allNodesUpgraded: true,
      },
    };

    mockUseLoadEsDeprecations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'All Elasticsearch nodes have been upgraded.'
    );
  });

  it('shows partially upgraded warning when nodes are running different versions', async () => {
    const error: ResponseError = {
      statusCode: 426,
      message: 'There are some nodes running a different version of Elasticsearch',
      attributes: {
        allNodesUpgraded: false,
      },
    };

    mockUseLoadEsDeprecations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      /Upgrade Kibana to the same version as your Elasticsearch cluster/i
    );
  });

  it('handles generic error', async () => {
    const error: ResponseError = {
      statusCode: 500,
      message: 'Internal server error',
    };

    mockUseLoadEsDeprecations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      resendRequest: jest.fn(),
    });
    mockUseLoadRemoteClusters.mockReturnValue({ data: [] });

    renderPage();

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'Could not retrieve Elasticsearch deprecation issues.'
    );
  });
});
