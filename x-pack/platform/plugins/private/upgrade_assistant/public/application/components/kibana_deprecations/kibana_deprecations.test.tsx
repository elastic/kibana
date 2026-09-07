/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';

const mockGetAllDeprecations = jest.fn();
const mockResolveDeprecation = jest.fn();
const mockSetBreadcrumbs = jest.fn();
const mockAddContent = jest.fn();
const mockRemoveContent = jest.fn();

interface PrivilegesCheckResult {
  hasPrivileges: boolean;
  isLoading: boolean;
  privilegesMissing: { cluster?: string[] };
}

jest.mock('@kbn/es-ui-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/es-ui-shared-plugin/public'),
  SectionLoading: ({ children }: { children: ReactNode }) => (
    <div data-test-subj="sectionLoading">{children}</div>
  ),
  GlobalFlyout: {
    useGlobalFlyout: () => ({
      addContent: mockAddContent,
      removeContent: mockRemoveContent,
    }),
  },
  WithPrivileges: ({ children }: { children: (result: PrivilegesCheckResult) => ReactNode }) =>
    children({ hasPrivileges: true, isLoading: false, privilegesMissing: {} }),
}));

const mockServices = {
  core: {
    deprecations: {
      getAllDeprecations: mockGetAllDeprecations,
      resolveDeprecation: mockResolveDeprecation,
    },
  },
  breadcrumbs: {
    setBreadcrumbs: mockSetBreadcrumbs,
  },
};

jest.mock('../../app_context', () => ({
  ...jest.requireActual('../../app_context'),
  useAppContext: () => ({
    services: mockServices,
  }),
}));

import { KibanaDeprecationsList } from './kibana_deprecations';

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const kibanaDeprecations = [
  {
    correctiveActions: {
      manualSteps: ['Step 1'],
      api: { method: 'POST' as const, path: '/test' },
    },
    domainId: 'test_domain_1',
    level: 'critical',
    title: 'Test deprecation title 1',
    message: 'Test deprecation message 1',
    deprecationType: 'config',
    configPath: 'test',
  },
  {
    correctiveActions: {
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
    },
    domainId: 'test_domain_2',
    level: 'warning',
    title: 'Test deprecation title 2',
    documentationUrl: 'https://',
    message: 'Test deprecation message 2',
    deprecationType: 'feature',
  },
  {
    correctiveActions: {
      manualSteps: [],
    },
    domainId: 'test_domain_3',
    level: 'warning',
    title: 'Test deprecation title 3',
    message: 'Test deprecation message 3',
    deprecationType: 'feature',
  },
];

const mockHistory = createMemoryHistory({ initialEntries: ['/kibana_deprecations'] });

describe('KibanaDeprecationsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllDeprecations.mockResolvedValue(kibanaDeprecations);
  });

  describe('WHEN deprecations load successfully', () => {
    it('SHOULD render deprecations table with correct items', async () => {
      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
      });

      expect(screen.getByTestId('kibanaDeprecationsTable')).toBeInTheDocument();
      expect(screen.getAllByTestId('row')).toHaveLength(kibanaDeprecations.length);
    });

    it('SHOULD show critical and warning deprecation counts', async () => {
      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
      });

      expect(screen.getByTestId('criticalDeprecationsCount')).toHaveTextContent('Critical: 1');
      expect(screen.getByTestId('warningDeprecationsCount')).toHaveTextContent('Warning: 2');
    });
  });

  describe('WHEN deprecations service returns an error', () => {
    it('SHOULD render the loading error prompt', async () => {
      mockGetAllDeprecations.mockRejectedValue(new Error('Internal Server Error'));

      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('deprecationsPageLoadingError')).toBeInTheDocument();
      });

      expect(screen.getByTestId('deprecationsPageLoadingError')).toHaveTextContent(
        'Could not retrieve Kibana deprecation issues'
      );
    });
  });

  describe('WHEN there are no deprecations', () => {
    it('SHOULD render the no deprecations prompt', async () => {
      mockGetAllDeprecations.mockResolvedValue([]);

      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('noDeprecationsPrompt')).toBeInTheDocument();
      });

      expect(screen.getByTestId('noDeprecationsPrompt')).toHaveTextContent(
        'Your Kibana configuration is up to date'
      );
    });
  });

  describe('WHEN there are plugin fetch errors', () => {
    it('SHOULD show the deprecation errors callout', async () => {
      mockGetAllDeprecations.mockResolvedValue([
        ...kibanaDeprecations,
        {
          domainId: 'failed_plugin_id_1',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: 'Failed to get deprecations info for plugin "failed_plugin_id".',
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
        {
          domainId: 'failed_plugin_id_1',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: 'Failed to get deprecations info for plugin "failed_plugin_id".',
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
        {
          domainId: 'failed_plugin_id_2',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: 'Failed to get deprecations info for plugin "failed_plugin_id".',
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ]);

      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecationErrors')).toBeInTheDocument();
      });

      expect(screen.getByTestId('kibanaDeprecationErrors')).toHaveTextContent(
        'Failed to get deprecation issues for these plugins: failed_plugin_id_1, failed_plugin_id_2.'
      );
    });

    it('SHOULD show missing privileges warning when hasPrivileges is false', async () => {
      mockGetAllDeprecations.mockResolvedValue(kibanaDeprecations);

      renderWithProviders(
        <KibanaDeprecationsList
          history={mockHistory}
          hasPrivileges={false}
          privilegesMissing={{ cluster: ['manage_security'] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecationErrors')).toBeInTheDocument();
      });

      expect(screen.getByTestId('kibanaDeprecationErrors')).toHaveTextContent(
        'Certain issues might be missing due to missing cluster privilege for: manage_security'
      );
    });
  });

  describe('WHEN refresh is triggered', () => {
    it('SHOULD call getAllDeprecations again', async () => {
      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
      });

      expect(mockGetAllDeprecations).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('refreshButton'));

      await waitFor(() => {
        expect(mockGetAllDeprecations).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('WHEN a deprecation is opened and resolved', () => {
    it('SHOULD add flyout content and resolve successfully', async () => {
      mockResolveDeprecation.mockResolvedValue({ status: 'ok' });

      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByTestId('row')[0]);

      await waitFor(() => {
        expect(mockAddContent).toHaveBeenCalledTimes(1);
      });

      const flyoutConfig = mockAddContent.mock.calls[0][0];
      await act(async () => {
        await flyoutConfig.props.resolveDeprecation(flyoutConfig.props.deprecation);
      });

      expect(mockResolveDeprecation).toHaveBeenCalledTimes(1);
      expect(mockResolveDeprecation).toHaveBeenCalledWith(flyoutConfig.props.deprecation);

      await waitFor(() => {
        expect(mockRemoveContent).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getAllByTestId('row')[0]);

      await waitFor(() => {
        expect(mockAddContent).toHaveBeenCalledTimes(2);
      });

      const reopenedFlyoutConfig = mockAddContent.mock.calls[1][0];
      expect(reopenedFlyoutConfig.props.deprecationResolutionState).toEqual(
        expect.objectContaining({ resolveDeprecationStatus: 'ok' })
      );
    });

    it('SHOULD store failure state and expose it when reopened', async () => {
      mockResolveDeprecation.mockResolvedValue({ status: 'fail', reason: 'resolve failed' });

      renderWithProviders(
        <KibanaDeprecationsList history={mockHistory} hasPrivileges={true} privilegesMissing={{}} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByTestId('row')[0]);

      await waitFor(() => {
        expect(mockAddContent).toHaveBeenCalledTimes(1);
      });

      const firstFlyoutConfig = mockAddContent.mock.calls[0][0];
      await act(async () => {
        await firstFlyoutConfig.props.resolveDeprecation(firstFlyoutConfig.props.deprecation);
      });

      await waitFor(() => {
        expect(mockRemoveContent).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getAllByTestId('row')[0]);

      await waitFor(() => {
        expect(mockAddContent).toHaveBeenCalledTimes(2);
      });

      const secondFlyoutConfig = mockAddContent.mock.calls[1][0];
      expect(secondFlyoutConfig.props.deprecationResolutionState).toEqual(
        expect.objectContaining({
          resolveDeprecationStatus: 'fail',
          resolveDeprecationError: 'resolve failed',
        })
      );
    });
  });
});
