/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { StreamConfiguration } from './stream_configuration';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const mockStreamsRepositoryClient = {
  fetch: jest.fn().mockResolvedValue({
    streams: [{ stream: { name: 'test-stream-1' } }, { stream: { name: 'test-stream-2' } }],
    canReadFailureStore: true,
  }),
};

describe('StreamConfiguration', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      onCreate: jest.fn(),
      onCancel: jest.fn(),
      streamsRepositoryClient: mockStreamsRepositoryClient as any,
    };

    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <StreamConfiguration {...defaultProps} {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  beforeEach(() => {
    queryClient.clear();
  });

  it('renders the flyout with title', async () => {
    renderComponent();

    expect(screen.getByText('Stream metrics configuration')).toBeInTheDocument();
  });

  it('renders cancel and save buttons', async () => {
    renderComponent();

    expect(screen.getByTestId('streamMetricsCancelButton')).toBeInTheDocument();
    expect(screen.getByTestId('streamMetricsConfirmButton')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = jest.fn();
    renderComponent({ onCancel });

    fireEvent.click(screen.getByTestId('streamMetricsCancelButton'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables save button when no stream is selected', async () => {
    renderComponent();

    const saveButton = screen.getByTestId('streamMetricsConfirmButton');
    expect(saveButton).toBeDisabled();
  });

  it('loads streams list', async () => {
    renderComponent();

    // Wait for streams to load
    await waitFor(() => {
      expect(screen.getByTestId('streamMetricsStreamSelector')).toBeInTheDocument();
    });
  });

  it('enables save button when initial stream is selected', async () => {
    renderComponent({
      initialState: { streamName: 'test-stream-1' },
    });

    await waitFor(() => {
      // The save button should be enabled when a stream is pre-selected
      const saveButton = screen.getByTestId('streamMetricsConfirmButton');
      expect(saveButton).not.toBeDisabled();
    });
  });
});
