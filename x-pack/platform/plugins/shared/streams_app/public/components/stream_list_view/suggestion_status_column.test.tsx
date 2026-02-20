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
import {
  useStreamsAppRouter,
  type StatefulStreamsAppRouter,
} from '../../hooks/use_streams_app_router';

jest.mock('../../hooks/use_streams_app_router');

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

const createStatus = (
  overrides: Partial<{
    stream: string;
    suggestionCount: number;
    pipelineCount: number;
    pipelineInProgressCount: number;
    pipelineFailedCount: number;
    featuresCount: number;
    significantEventsCount: number;
  }> = {}
) => ({
  stream: 'test-stream',
  suggestionCount: 0,
  pipelineCount: 0,
  pipelineInProgressCount: 0,
  pipelineFailedCount: 0,
  featuresCount: 0,
  significantEventsCount: 0,
  ...overrides,
});

describe('SuggestionStatusColumn', () => {
  const mockRouterLink = jest.fn((path: string, params: { path: { key: string; tab: string } }) => {
    const { key, tab } = params.path;
    return `/app/streams/${key}/management/${tab}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStreamsAppRouter.mockReturnValue({
      link: mockRouterLink,
    } as unknown as StatefulStreamsAppRouter);
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderWithProviders(
        <SuggestionStatusColumn streamName="test-stream" status={undefined} isLoading={true} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Generating State', () => {
    it('should show "Generating..." with spinner when pipelineInProgressCount > 0', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineInProgressCount: 1 })}
          isLoading={false}
        />
      );

      expect(screen.getByText('Generating...')).toBeInTheDocument();
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

    it('should show dash when all counts are 0', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus()}
          isLoading={false}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should show dash when only significant events exist (since they are excluded)', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ suggestionCount: 2, significantEventsCount: 2 })}
          isLoading={false}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.queryByTestId('suggestionStatusBadge-test-stream')).not.toBeInTheDocument();
    });
  });

  describe('Available Badge Display', () => {
    it('should show green badge with available count', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 2 })}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('suggestionStatusBadge-test-stream')).toBeInTheDocument();
      expect(screen.getByText('2 available')).toBeInTheDocument();
    });

    it('should have correct aria label for available suggestions', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 3 })}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText('3 suggestions available')).toBeInTheDocument();
    });
  });

  describe('Failed Badge Display', () => {
    it('should show red badge with failed count', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineFailedCount: 1 })}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('suggestionStatusBadge-test-stream')).toBeInTheDocument();
      expect(screen.getByText('1 failed')).toBeInTheDocument();
    });

    it('should have correct aria label for failed suggestions', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineFailedCount: 2 })}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText('2 suggestions failed')).toBeInTheDocument();
    });
  });

  describe('Mixed Badge Display', () => {
    it('should show warning badge with both available and failed counts', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 1, pipelineFailedCount: 1 })}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('suggestionStatusBadge-test-stream')).toBeInTheDocument();
      expect(screen.getByText('1 available, 1 failed')).toBeInTheDocument();
    });

    it('should have correct aria label for mixed state', () => {
      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 2, pipelineFailedCount: 1 })}
          isLoading={false}
        />
      );

      expect(
        screen.getByLabelText('2 suggestions available, 1 suggestion failed')
      ).toBeInTheDocument();
    });
  });

  describe('Popover Behavior', () => {
    it('should open popover when badge is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 2 })}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(screen.getByText('Review suggestions')).toBeInTheDocument();
        expect(screen.getByTestId('suggestionLink-test-stream-processing')).toBeInTheDocument();
      });
    });

    it('should show correct description for available suggestions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 2 })}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(screen.getByText('Review new processing suggestions.')).toBeInTheDocument();
        expect(screen.getByText('Review in processing page')).toBeInTheDocument();
      });
    });

    it('should show correct description for failed suggestions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineFailedCount: 1 })}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(
          screen.getByText('Something went wrong while creating the processing suggestion.')
        ).toBeInTheDocument();
        expect(screen.getByText('Try again in processing page')).toBeInTheDocument();
      });
    });

    it('should show correct description for mixed state', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="test-stream"
          status={createStatus({ pipelineCount: 1, pipelineFailedCount: 2 })}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-test-stream'));

      await waitFor(() => {
        expect(
          screen.getByText('1 processing suggestion available. 2 processing suggestions failed.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Suggestion Links', () => {
    it('should generate correct link for processing suggestions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SuggestionStatusColumn
          streamName="logs"
          status={createStatus({ stream: 'logs', pipelineCount: 1 })}
          isLoading={false}
        />
      );

      await user.click(screen.getByTestId('suggestionStatusBadge-logs'));

      await waitFor(() => {
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
          status={createStatus({ stream: 'my-stream', pipelineCount: 1 })}
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
