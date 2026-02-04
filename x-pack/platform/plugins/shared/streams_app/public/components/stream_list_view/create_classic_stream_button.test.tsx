/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamListView } from '.';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimefilter } from '../../hooks/use_timefilter';
import { usePerformanceContext } from '@kbn/ebt-tools';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_streams_privileges');
jest.mock('../../hooks/use_streams_app_fetch');
jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_timefilter');
jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: jest.fn(),
}));

// Mock child components that are not relevant to this test
jest.mock('../feedback_button', () => ({
  FeedbackButton: () => <div data-testid="mockFeedbackButton">Feedback</div>,
}));
jest.mock('./streams_list_empty_prompt', () => ({
  StreamsListEmptyPrompt: () => <div data-testid="mockEmptyPrompt">Empty</div>,
}));
jest.mock('../streams_tour', () => ({
  WelcomeTourCallout: () => null,
}));
jest.mock('./tree_table', () => ({
  StreamsTreeTable: () => <div data-testid="mockTreeTable">TreeTable</div>,
}));
jest.mock('./streams_settings_flyout', () => ({
  StreamsSettingsFlyout: () => <div data-testid="mockSettingsFlyout">Settings</div>,
}));
jest.mock('./classic_stream_creation_flyout', () => ({
  ClassicStreamCreationFlyout: () => <div data-testid="mockCreationFlyout">Creation</div>,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseStreamsPrivileges = useStreamsPrivileges as jest.MockedFunction<
  typeof useStreamsPrivileges
>;
const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUsePerformanceContext = usePerformanceContext as jest.MockedFunction<
  typeof usePerformanceContext
>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamListView - Create Classic Stream Button', () => {
  const mockGetClassicStatus = jest.fn();
  const mockAddError = jest.fn();

  const defaultKibanaMock = {
    isServerless: false,
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: jest.fn().mockResolvedValue({ streams: [] }),
          },
          getClassicStatus: mockGetClassicStatus,
        },
        cloud: {
          isCloudEnabled: false,
        },
      },
    },
    core: {
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
    },
    services: {
      version: '8.0.0',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue(defaultKibanaMock as any);

    mockUseStreamsAppRouter.mockReturnValue({
      link: jest.fn((path) => path),
    } as any);

    mockUseTimefilter.mockReturnValue({
      timeState: { start: 'now-15m', end: 'now' },
    } as any);

    mockUseStreamsAppFetch.mockReturnValue({
      loading: false,
      value: { streams: [], canReadFailureStore: false },
      refresh: jest.fn(),
    } as any);

    mockUsePerformanceContext.mockReturnValue({
      onPageReady: jest.fn(),
    } as any);
  });

  describe('Button enabled state', () => {
    it('should enable button when user has both Kibana and Elasticsearch permissions', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: true },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: true,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');
      expect(button).not.toBeDisabled();
    });

    it('should disable button when user lacks Kibana manage permission', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: false },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: true,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');
      expect(button).toBeDisabled();
    });

    it('should disable button when user lacks Elasticsearch manage_index_templates privilege', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: true },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: false,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');
      expect(button).toBeDisabled();
    });
  });

  describe('Tooltip behavior', () => {
    it('should show Kibana permission tooltip when user lacks Kibana manage permission', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: false },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: true,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');

      // Use fireEvent for disabled buttons (which have pointer-events: none)
      await act(async () => {
        fireEvent.mouseOver(button);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            'You need the Kibana manage streams privilege to create classic streams.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should show Elasticsearch permission tooltip when user has Kibana permission but lacks ES privilege', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: true },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: false,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');

      // Use fireEvent for disabled buttons (which have pointer-events: none)
      await act(async () => {
        fireEvent.mouseOver(button);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            'You need the Elasticsearch manage_index_templates privilege to create classic streams.'
          )
        ).toBeInTheDocument();
      });
    });

    it('should not show tooltip when user has all required permissions', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: true },
        features: {},
      } as any);

      mockGetClassicStatus.mockResolvedValue({
        can_manage: true,
      });

      renderWithProviders(<StreamListView />);

      await waitFor(() => {
        expect(mockGetClassicStatus).toHaveBeenCalled();
      });

      const button = screen.getByTestId('streamsCreateClassicStreamButton');

      // Hover over the button
      await act(async () => {
        await userEvent.hover(button);
      });

      // Wait a moment for any tooltip to appear
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Neither tooltip message should be visible
      expect(
        screen.queryByText(
          'You need the Kibana manage streams privilege to create classic streams.'
        )
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'You need the Elasticsearch manage_index_templates privilege to create classic streams.'
        )
      ).not.toBeInTheDocument();
    });
  });
});
