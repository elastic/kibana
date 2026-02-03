/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { I18nProvider } from '@kbn/i18n-react';
import { ClassicAdvancedView } from './classic_advanced_view';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({ onPageReady: jest.fn() }),
}));

jest.mock('../../../../hooks/use_ai_features', () => ({
  useAIFeatures: () => null,
}));

// Mock the useStreamsPrivileges hook
jest.mock('../../../../hooks/use_streams_privileges');

// Mock hooks used by StreamDescription
jest.mock('../../../stream_detail_systems/stream_description/use_stream_description_api', () => ({
  useStreamDescriptionApi: () => ({
    description: '',
    setDescription: jest.fn(),
    isUpdating: false,
    isEditing: false,
    onCancelEdit: jest.fn(),
    onStartEditing: jest.fn(),
    onSaveDescription: jest.fn(),
    isTaskLoading: false,
    task: undefined,
    taskError: null,
    refreshTask: jest.fn(),
    getDescriptionGenerationStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
    scheduleDescriptionGenerationTask: jest.fn(),
    cancelDescriptionGenerationTask: jest.fn(),
    acknowledgeDescriptionGenerationTask: jest.fn(),
    areButtonsDisabled: false,
  }),
}));

// Mock hooks used by StreamDiscoveryConfiguration
jest.mock('../../../stream_detail_systems/stream_systems/hooks/use_stream_systems', () => ({
  useStreamSystems: () => ({
    systems: [],
    refreshSystems: jest.fn(),
    systemsLoading: false,
  }),
}));

jest.mock('../../../../hooks/use_stream_features', () => ({
  useStreamFeatures: () => ({
    features: [],
    featuresLoading: false,
    refreshFeatures: jest.fn(),
    error: null,
  }),
}));

jest.mock('../../../../hooks/use_stream_features_api', () => ({
  useStreamFeaturesApi: () => ({
    getFeaturesIdentificationStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
    scheduleFeaturesIdentificationTask: jest.fn(),
    cancelFeaturesIdentificationTask: jest.fn(),
    deleteFeature: jest.fn(),
    deleteFeaturesInBulk: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/use_ai_features', () => ({
  useAIFeatures: () => ({
    genAiConnectors: { selectedConnector: null },
  }),
}));

jest.mock('../../../../hooks/use_stream_systems_api', () => ({
  useStreamSystemsApi: () => ({
    identifySystems: jest.fn(),
    getSystemIdentificationStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
    scheduleSystemIdentificationTask: jest.fn(),
    cancelSystemIdentificationTask: jest.fn(),
    acknowledgeSystemIdentificationTask: jest.fn(),
    addSystemsToStream: jest.fn(),
    removeSystemsFromStream: jest.fn(),
    upsertSystem: jest.fn(),
    abort: jest.fn(),
  }),
}));

// Mock hooks used by IndexConfiguration/Settings and UnmanagedElasticsearchAssets
jest.mock('../../../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => ({
    loading: false,
  }),
}));

jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: () => ({
    value: {
      indexTemplate: {
        name: 'logs-test-template',
        index_template: {
          index_patterns: ['logs-test-*'],
          _meta: {},
        },
      },
      ingestPipeline: { name: 'logs-test-pipeline', _meta: {} },
      dataStream: { name: 'logs-test-default', indices: [], status: 'green' },
      componentTemplates: [],
    },
    loading: false,
    error: null,
  }),
}));

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    isServerless: false,
    appParams: { history: {} },
    core: {
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      application: { navigateToApp: jest.fn(), navigateToUrl: jest.fn() },
      pricing: { isFeatureAvailable: jest.fn(() => false) },
      uiSettings: {
        get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      },
      overlays: { openConfirm: jest.fn() },
      http: {},
    },
    dependencies: {
      start: {
        licensing: {
          license$: {
            subscribe: (observer: any) => {
              const license = { hasAtLeast: () => true };
              if (typeof observer === 'function') observer(license);
              else observer?.next?.(license);
              return { unsubscribe: jest.fn() };
            },
          },
        },
        streams: { streamsRepositoryClient: { fetch: jest.fn() } },
        indexManagement: {
          getComponentTemplateFlyoutComponent: () => () => null,
          getDatastreamFlyoutComponent: () => () => null,
          getIndexTemplateFlyoutComponent: () => () => null,
        },
        ingestPipelines: {
          getIngestPipelineFlyoutComponent: () => () => null,
        },
        share: {
          url: {
            locators: {
              get: () => ({ getRedirectUrl: () => '/test-url' }),
            },
          },
        },
      },
    },
  }),
}));

// Mock ConnectorListButton used in StreamDescription
jest.mock('../../../connector_list_button/connector_list_button', () => ({
  ConnectorListButton: ({ buttonProps }: { buttonProps: { children: React.ReactNode } }) => (
    <button type="button">{buttonProps.children}</button>
  ),
  ConnectorListButtonBase: ({ buttonProps }: { buttonProps: { children: React.ReactNode } }) => (
    <button type="button">{buttonProps.children}</button>
  ),
}));

const mockUseStreamsPrivileges = useStreamsPrivileges as jest.MockedFunction<
  typeof useStreamsPrivileges
>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('ClassicAdvancedView', () => {
  const createMockDefinition = (
    streamName: string = 'logs-test-default'
  ): Streams.ClassicStream.GetResponse =>
    ({
      stream: {
        name: streamName,
        description: '',
        ingest: {
          processing: { steps: [] },
          lifecycle: { dsl: { data_retention: '7d' } },
          settings: {},
        },
      },
      effective_lifecycle: { dsl: { data_retention: '7d' } },
      effective_settings: {
        'index.refresh_interval': { value: '1s' },
      },
      privileges: { manage: true, simulate: true, read: true },
      data_stream_exists: true,
    } as unknown as Streams.ClassicStream.GetResponse);

  const mockRefreshDefinition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Significant Events Feature (Stream Description & Feature Configuration)', () => {
    it('should render Stream description panel when significantEvents feature is enabled and available', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true, available: true },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Check the Stream description panel title is rendered
      expect(screen.getByText('Stream description')).toBeInTheDocument();
    });

    it('should render Stream discovery panel when significantEvents feature is enabled and available', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true, available: true },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Check the Stream discovery panel title is rendered
      expect(screen.getByText('Stream discovery')).toBeInTheDocument();
    });

    it('should NOT render Stream description or Stream discovery when significantEvents is disabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false, available: true },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Stream discovery')).not.toBeInTheDocument();
    });

    it('should NOT render Stream description or Stream discovery when significantEvents is enabled but not available (basic license)', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true, available: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // These components require enterprise license and should NOT render with basic license
      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Stream discovery')).not.toBeInTheDocument();
    });

    it('should NOT render Stream description or Stream discovery when significantEvents is undefined', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: undefined,
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Stream discovery')).not.toBeInTheDocument();
    });

    it('should NOT render Stream description or Stream discovery when significantEvents available is undefined', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true, available: undefined },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Stream discovery')).not.toBeInTheDocument();
    });
  });

  describe('Unmanaged Elasticsearch Assets', () => {
    it('should always render Index Configuration section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Index Configuration')).toBeInTheDocument();
    });

    it('should render Index template section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Index template')).toBeInTheDocument();
    });

    it('should render Pipeline section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Pipeline')).toBeInTheDocument();
    });

    it('should render Data stream section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Data stream')).toBeInTheDocument();
    });

    it('should render Component templates section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Component templates')).toBeInTheDocument();
    });

    it('should render Refresh Interval setting', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Refresh Interval')).toBeInTheDocument();
    });
  });

  describe('Delete Stream Panel', () => {
    it('should always render Delete stream panel for classic streams', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByRole('button', { name: /delete stream/i })).toBeInTheDocument();
    });

    it('should render Delete stream panel regardless of significantEvents feature flag', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByRole('button', { name: /delete stream/i })).toBeInTheDocument();
    });
  });

  describe('All Features Enabled', () => {
    it('should render all panels when significantEvents is enabled and available', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          significantEvents: { enabled: true, available: true },
        },
      } as any);

      renderWithProviders(
        <ClassicAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Stream description
      expect(screen.getByText('Stream description')).toBeInTheDocument();
      // Stream discovery (contains Features and Systems)
      expect(screen.getByText('Stream discovery')).toBeInTheDocument();
      // Index Configuration
      expect(screen.getByText('Index Configuration')).toBeInTheDocument();
      // Elasticsearch assets
      expect(screen.getByText('Index template')).toBeInTheDocument();
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Data stream')).toBeInTheDocument();
      expect(screen.getByText('Component templates')).toBeInTheDocument();
      // Delete stream
      expect(screen.getByRole('heading', { name: /delete stream/i })).toBeInTheDocument();
    });
  });
});
