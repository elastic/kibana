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

// Mock the useStreamsPrivileges hook
jest.mock('../../../../hooks/use_streams_privileges');
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';

// Mock hooks used by StreamDescription
jest.mock('../../../stream_detail_features/stream_description/use_stream_description_api', () => ({
  useStreamDescriptionApi: () => ({
    isGenerating: false,
    description: '',
    isUpdating: false,
    isEditing: false,
    setDescription: jest.fn(),
    onCancelEdit: jest.fn(),
    onGenerateDescription: jest.fn(),
    onSaveDescription: jest.fn(),
    onStartEditing: jest.fn(),
    areButtonsDisabled: false,
  }),
}));

// Mock hooks used by StreamFeatureConfiguration
jest.mock('../../../stream_detail_features/stream_features/hooks/use_stream_features', () => ({
  useStreamFeatures: () => ({
    features: [],
    refreshFeatures: jest.fn(),
    featuresLoading: false,
  }),
}));

jest.mock(
  '../../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features',
  () => ({
    useAIFeatures: () => ({
      genAiConnectors: { selectedConnector: null },
    }),
  })
);

jest.mock('../../../../hooks/use_stream_features_api', () => ({
  useStreamFeaturesApi: () => ({
    identifyFeatures: jest.fn(),
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
      indexTemplate: { name: 'logs-test-template', managed: false },
      ingestPipeline: { name: 'logs-test-pipeline', managed: false },
      dataStream: { name: 'logs-test-default' },
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
      application: { navigateToApp: jest.fn() },
    },
    dependencies: {
      start: {
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
    it('should render Stream description panel when significantEvents feature is enabled', () => {
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

      // Check the Stream description panel title is rendered
      expect(screen.getByText('Stream description')).toBeInTheDocument();
      // Check the description help text is rendered
      expect(
        screen.getByText(/This is a natural language description of your data/i)
      ).toBeInTheDocument();
    });

    it('should render Feature identification panel when significantEvents feature is enabled', () => {
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

      // Check the Feature identification panel title is rendered
      expect(screen.getByText('Feature identification')).toBeInTheDocument();
      // Check the Identify features button is rendered
      expect(screen.getByRole('button', { name: /identify features/i })).toBeInTheDocument();
    });

    it('should NOT render Stream description or Feature identification when significantEvents is disabled', () => {
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

      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature identification')).not.toBeInTheDocument();
    });

    it('should NOT render Stream description or Feature identification when significantEvents is undefined', () => {
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
      expect(screen.queryByText('Feature identification')).not.toBeInTheDocument();
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

      expect(screen.getByText('Delete stream')).toBeInTheDocument();
      expect(
        screen.getByText(/Permanently delete your stream and all its contents/)
      ).toBeInTheDocument();
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

      expect(screen.getByText('Delete stream')).toBeInTheDocument();
    });
  });

  describe('All Features Enabled', () => {
    it('should render all panels when significantEvents is enabled', () => {
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

      // Stream description
      expect(screen.getByText('Stream description')).toBeInTheDocument();
      // Feature identification
      expect(screen.getByText('Feature identification')).toBeInTheDocument();
      // Index Configuration
      expect(screen.getByText('Index Configuration')).toBeInTheDocument();
      // Elasticsearch assets
      expect(screen.getByText('Index template')).toBeInTheDocument();
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Data stream')).toBeInTheDocument();
      expect(screen.getByText('Component templates')).toBeInTheDocument();
      // Delete stream
      expect(screen.getByText('Delete stream')).toBeInTheDocument();
    });
  });
});
