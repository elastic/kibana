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
  });

  describe('Badge Display', () => {
    it('should show badge with total suggestion count', () => {
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

      expect(screen.getByTestId('suggestionStatusBadge-test-stream')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should have correct aria label for accessibility', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 5,
            pipelineCount: 2,
            featuresCount: 2,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText('5 suggestions available')).toBeInTheDocument();
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
            pipelineCount: 1,
            featuresCount: 1,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      // Check all three suggestion types are visible
      await waitFor(() => {
        expect(screen.getByTestId('suggestionLink-test-stream-partitioning')).toBeInTheDocument();
        expect(
          screen.getByTestId('suggestionLink-test-stream-significantEvents')
        ).toBeInTheDocument();
        expect(screen.getByTestId('suggestionLink-test-stream-processing')).toBeInTheDocument();
      });
    });

    it('should only show suggestion types with count > 0', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={{
            stream: 'test-stream',
            suggestionCount: 2,
            pipelineCount: 0,
            featuresCount: 1,
            significantEventsCount: 1,
          }}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(screen.getByTestId('suggestionLink-test-stream-partitioning')).toBeInTheDocument();
        expect(
          screen.getByTestId('suggestionLink-test-stream-significantEvents')
        ).toBeInTheDocument();
      });

      expect(screen.queryByTestId('suggestionLink-test-stream-processing')).not.toBeInTheDocument();
    });

    it('should show correct labels for each suggestion type', async () => {
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
        expect(screen.getByText('3 partitioning suggestions')).toBeInTheDocument();
        expect(screen.getByText('1 significant events suggestion')).toBeInTheDocument();
        expect(screen.getByText('2 processing suggestions')).toBeInTheDocument();
      });
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
        expect(screen.getByText('1 partitioning suggestion')).toBeInTheDocument();
        expect(screen.getByText('1 significant events suggestion')).toBeInTheDocument();
        expect(screen.getByText('1 processing suggestion')).toBeInTheDocument();
      });
    });
  });

  describe('Suggestion Links', () => {
    it('should generate correct links for each suggestion type', async () => {
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
        expect(mockRouterLink).toHaveBeenCalledWith('/{key}/management/{tab}', {
          path: { key: 'logs', tab: 'partitioning' },
        });
        expect(mockRouterLink).toHaveBeenCalledWith('/{key}/management/{tab}', {
          path: { key: 'logs', tab: 'significantEvents' },
        });
        expect(mockRouterLink).toHaveBeenCalledWith('/{key}/management/{tab}', {
          path: { key: 'logs', tab: 'processing' },
        });
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
});
