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
import { WiredAdvancedView } from './wired_advanced_view';
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
jest.mock('../../../stream_detail_features/stream_description/use_stream_description_api', () => ({
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

// Mock hooks used by StreamFeatureConfiguration
jest.mock('../../../stream_detail_features/stream_features/hooks/use_stream_features', () => ({
  useStreamFeatures: () => ({
    features: [],
    refreshFeatures: jest.fn(),
    featuresLoading: false,
  }),
}));

jest.mock('../../../../hooks/use_ai_features', () => ({
  useAIFeatures: () => ({
    genAiConnectors: { selectedConnector: null },
  }),
}));

jest.mock('../../../../hooks/use_stream_features_api', () => ({
  useStreamFeaturesApi: () => ({
    getSystemIdentificationStatus: jest.fn().mockResolvedValue({ status: 'idle' }),
    scheduleSystemIdentificationTask: jest.fn(),
    cancelSystemIdentificationTask: jest.fn(),
    acknowledgeSystemIdentificationTask: jest.fn(),
    addSystemsToStream: jest.fn(),
    removeSystemsFromStream: jest.fn(),
    upsertSystem: jest.fn(),
    abort: jest.fn(),
  }),
}));

// Mock hooks used by IndexConfiguration/Settings
jest.mock('../../../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => ({
    loading: false,
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

describe('WiredAdvancedView', () => {
  const createMockDefinition = (
    streamName: string = 'logs.test'
  ): Streams.WiredStream.GetResponse =>
    ({
      stream: {
        name: streamName,
        description: '',
        ingest: {
          processing: { steps: [] },
          routing: [],
          lifecycle: { dsl: { data_retention: '7d' } },
          settings: {},
        },
      },
      effective_lifecycle: { dsl: { data_retention: '7d' } },
      effective_settings: {
        'index.refresh_interval': { value: '1s' },
      },
      privileges: { manage: true, simulate: true, read: true },
    } as unknown as Streams.WiredStream.GetResponse);

  const mockRefreshDefinition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Packs Feature (Import & Export)', () => {
    it('should render Import & Export panel when contentPacks feature is enabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: true },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Check the Import & Export panel title is rendered
      expect(screen.getByText('Import & export')).toBeInTheDocument();
      // Check the Import and Export buttons are rendered
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should NOT render Import & Export panel when contentPacks feature is disabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Import & export')).not.toBeInTheDocument();
    });
  });

  describe('Significant Events Feature (Stream Description & Feature Configuration)', () => {
    it('should render Stream description panel when significantEvents feature is enabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: true },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Check the Stream description panel title is rendered
      expect(screen.getByText('Stream description')).toBeInTheDocument();
    });

    it('should render Feature identification panel when significantEvents feature is enabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: true },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Check the Feature identification panel title is rendered
      expect(screen.getByText('Feature identification')).toBeInTheDocument();
    });

    it('should NOT render Stream description or Feature identification when significantEvents is disabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Stream description')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature identification')).not.toBeInTheDocument();
    });
  });

  describe('Index Configuration', () => {
    it('should always render Index Configuration section', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Index Configuration')).toBeInTheDocument();
    });

    it('should render Refresh Interval setting', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition()}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByText('Refresh Interval')).toBeInTheDocument();
    });
  });

  describe('Delete Stream Panel', () => {
    it('should render Delete stream panel for non-root streams', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition('logs.child')}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.getByRole('button', { name: /delete stream/i })).toBeInTheDocument();
    });

    it('should NOT render Delete stream panel for root streams', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: false },
          significantEvents: { enabled: false },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition('logs')}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      expect(screen.queryByText('Delete stream')).not.toBeInTheDocument();
    });
  });

  describe('All Features Enabled', () => {
    it('should render all panels when all features are enabled', () => {
      mockUseStreamsPrivileges.mockReturnValue({
        features: {
          contentPacks: { enabled: true },
          significantEvents: { enabled: true },
        },
      } as any);

      renderWithProviders(
        <WiredAdvancedView
          definition={createMockDefinition('logs.child')}
          refreshDefinition={mockRefreshDefinition}
        />
      );

      // Import & Export
      expect(screen.getByText('Import & export')).toBeInTheDocument();
      // Stream description
      expect(screen.getByText('Stream description')).toBeInTheDocument();
      // Feature identification
      expect(screen.getByText('Feature identification')).toBeInTheDocument();
      // Index Configuration
      expect(screen.getByText('Index Configuration')).toBeInTheDocument();
      // Delete stream (non-root)
      expect(screen.getByRole('heading', { name: /delete stream/i })).toBeInTheDocument();
    });
  });
});
