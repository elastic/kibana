/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { SuggestionStatusColumn } from './suggestion_status_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

jest.mock('../../hooks/use_streams_app_router');

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('SuggestionStatusColumn', () => {
  const mockRouterLink = jest.fn((path: string, params: any) => {
    const { key, tab } = params.path;
    return `/app/streams/${key}/management/${tab}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStreamsAppRouter.mockReturnValue({
      link: mockRouterLink,
    } as any);
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderWithProviders(
        <SuggestionStatusColumn streamName="test-stream" status={undefined} isLoading={true} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('No Suggestions', () => {
    it('should show dash when status is undefined', () => {
      renderWithProviders(
        <SuggestionStatusColumn streamName="test-stream" status={undefined} isLoading={false} />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByLabelText('No suggestions')).toBeInTheDocument();
    });

    it('should show dash when suggestionCount is 0', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 0,
            pipelineCount: 0,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should show dash when only significant events exist (since they are excluded)', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 2,
            pipelineCount: 0,
            featuresCount: 0,
            significantEventsCount: 2,
          }}
          isLoading={false}
        />
      );

      // Even though suggestionCount is 2, badge shows dash because significant events are excluded
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.queryByTestId('suggestionStatusBadge-test-stream')).not.toBeInTheDocument();
    });
  });

  describe('Badge Display', () => {
    it('should show badge with pipeline count only', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 3,
            pipelineCount: 2,
            featuresCount: 1,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('suggestionStatusBadge-test-stream')).toBeInTheDocument();
      // Badge shows only pipelineCount = 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should have correct aria label for accessibility', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 5,
            pipelineCount: 3,
            featuresCount: 2,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      // Aria label shows only pipelineCount = 3
      expect(screen.getByLabelText('3 suggestions available')).toBeInTheDocument();
    });

    it('should show dash when only features exist (pipelines are excluded)', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 2,
            pipelineCount: 0,
            featuresCount: 2,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      // Even though featuresCount is 2, badge shows dash because only pipelines are shown
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.queryByTestId('suggestionStatusBadge-test-stream')).not.toBeInTheDocument();
    });
  });

  describe('Popover Behavior', () => {
    it('should open popover when badge is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 3,
            pipelineCount: 2,
            featuresCount: 1,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      // Only processing suggestions are shown (partitioning and significant events excluded)
      await waitFor(() => {
        expect(screen.getByTestId('suggestionLink-test-stream-processing')).toBeInTheDocument();
      });

      // Partitioning and significant events should not be shown
      expect(
        screen.queryByTestId('suggestionLink-test-stream-partitioning')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('suggestionLink-test-stream-significantEvents')
      ).not.toBeInTheDocument();
    });

    it('should show correct labels for pipeline suggestions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 6,
            pipelineCount: 2,
            featuresCount: 3,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(screen.getByText('2 processing suggestions')).toBeInTheDocument();
      });

      // Partitioning and significant events are excluded from the popover
      expect(screen.queryByText('3 partitioning suggestions')).not.toBeInTheDocument();
      expect(screen.queryByText('1 significant events suggestion')).not.toBeInTheDocument();
    });

    it('should show singular form for count of 1', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 3,
            pipelineCount: 1,
            featuresCount: 1,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(screen.getByText('1 processing suggestion')).toBeInTheDocument();
      });

      // Partitioning and significant events are excluded from the popover
      expect(screen.queryByText('1 partitioning suggestion')).not.toBeInTheDocument();
      expect(screen.queryByText('1 significant events suggestion')).not.toBeInTheDocument();
    });
  });

  describe('Suggestion Links', () => {
    it('should generate correct link for processing suggestions only', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="logs"
          status={{
            stream: 'logs',
            suggestionCount: 3,
            pipelineCount: 1,
            featuresCount: 1,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-logs'));

      await waitFor(() => {
        // Only processing link is generated (partitioning and significant events excluded)
        expect(mockRouterLink).toHaveBeenCalledWith('/{key}/management/{tab}', {
          path: { key: 'logs', tab: 'processing' },
        });
      });

      // Partitioning and significant events links should not be generated
      expect(mockRouterLink).not.toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'partitioning' },
      });
      expect(mockRouterLink).not.toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'significantEvents' },
      });
    });

    it('should set correct href on links', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="my-stream"
          status={{
            stream: 'my-stream',
            suggestionCount: 1,
            pipelineCount: 1,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-my-stream'));

      await waitFor(() => {
        const link = screen.getByTestId('suggestionLink-my-stream-processing');
        expect(link).toHaveAttribute('href', '/app/streams/my-stream/management/processing');
      });
    });
  });

  describe('Dismiss Button', () => {
    it('should not show dismiss button when onDismiss is not provided', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 1,
            pipelineCount: 1,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
        />
      );

      expect(screen.queryByTestId('suggestionDismissButton-test-stream')).not.toBeInTheDocument();
    });

    it('should show dismiss button when onDismiss is provided', () => {
      const mockOnDismiss = jest.fn();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 1,
            pipelineCount: 1,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('suggestionDismissButton-test-stream')).toBeInTheDocument();
    });

    it('should call onDismiss with stream name when clicked', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = jest.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="logs.linux"
          status={{
            stream: 'logs.linux',
            suggestionCount: 1,
            pipelineCount: 1,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
          onDismiss={mockOnDismiss}
        />
      );

      await user.click(screen.getByTestId('suggestionDismissButton-logs.linux'));

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith('logs.linux');
      });
    });

    it('should have correct aria label', () => {
      const mockOnDismiss = jest.fn();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 1,
            pipelineCount: 1,
            featuresCount: 0,
            significantEventsCount: 0,
          }}
          isLoading={false}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByLabelText('Dismiss suggestion')).toBeInTheDocument();
    });
  });
});
