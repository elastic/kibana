/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PipelineChatPanel } from './pipeline_chat_panel';

const mockMutateAsync = jest.fn();
jest.mock('../../../../common', () => ({
  useChatEditPipeline: () => ({
    chatEditPipelineMutation: {
      mutateAsync: mockMutateAsync,
      isLoading: false,
    },
  }),
  useLoadConnectors: () => ({
    connectors: [
      { id: 'connector-1', name: 'Test Connector', actionTypeId: '.gen-ai' },
      { id: 'connector-2', name: 'Another Connector', actionTypeId: '.bedrock' },
    ],
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
  }),
}));

describe('PipelineChatPanel', () => {
  const defaultProps = {
    integrationId: 'integration-123',
    dataStreamId: 'ds-1',
    connectorId: 'connector-1',
    pipelineText: JSON.stringify({ processors: [{ set: { field: 'test', value: '1' } }] }),
    onApplyPipeline: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the panel title', () => {
    render(<PipelineChatPanel {...defaultProps} />);
    expect(screen.getByText('AI Pipeline Editor')).toBeInTheDocument();
  });

  it('should render input field', () => {
    render(<PipelineChatPanel {...defaultProps} />);
    expect(screen.getByTestId('chatPipelineInput')).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<PipelineChatPanel {...defaultProps} />);
    expect(screen.getByTestId('chatPipelineSendButton')).toBeInTheDocument();
  });

  it('should not show connector selector when connectorId is provided', () => {
    render(<PipelineChatPanel {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /select ai connector/i })).not.toBeInTheDocument();
  });

  it('should show connector selector when connectorId is not provided', () => {
    render(<PipelineChatPanel {...defaultProps} connectorId={undefined} />);
    expect(screen.getByText('Select an AI connector to use the AI editor.')).toBeInTheDocument();
  });

  it('should send message and display response when user types and sends', async () => {
    const updatedPipeline = {
      processors: [
        { set: { field: 'test', value: '1' } },
        { rename: { field: 'src_ip', target_field: 'source.ip' } },
      ],
    };

    mockMutateAsync.mockResolvedValue({
      updatedPipeline,
      explanation: 'Added a rename processor for ECS compliance.',
      validationResults: {
        success_rate: 100,
        successful_samples: 5,
        failed_samples: 0,
        total_samples: 5,
        failure_details: [],
      },
    });

    render(<PipelineChatPanel {...defaultProps} />);

    const input = screen.getByTestId('chatPipelineInput');
    await userEvent.type(input, 'Add ECS mapping for source IP');
    await userEvent.click(screen.getByTestId('chatPipelineSendButton'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'ds-1',
          connectorId: 'connector-1',
          userMessage: 'Add ECS mapping for source IP',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Added a rename processor for ECS compliance.')).toBeInTheDocument();
    });
  });

  it('should apply pipeline when Apply button is clicked', async () => {
    const updatedPipeline = { processors: [{ set: { field: 'new', value: 'value' } }] };

    mockMutateAsync.mockResolvedValue({
      updatedPipeline,
      explanation: 'Changed the pipeline.',
      validationResults: {
        success_rate: 100,
        successful_samples: 3,
        failed_samples: 0,
        total_samples: 3,
        failure_details: [],
      },
    });

    render(<PipelineChatPanel {...defaultProps} />);

    const input = screen.getByTestId('chatPipelineInput');
    await userEvent.type(input, 'Change the pipeline');
    await userEvent.click(screen.getByTestId('chatPipelineSendButton'));

    await waitFor(() => {
      expect(screen.getByTestId('chatApplyPipelineButton')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('chatApplyPipelineButton'));

    expect(defaultProps.onApplyPipeline).toHaveBeenCalledWith(
      JSON.stringify(updatedPipeline, null, 2)
    );
  });

  it('should show error message when API call fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Something went wrong'));

    render(<PipelineChatPanel {...defaultProps} />);

    const input = screen.getByTestId('chatPipelineInput');
    await userEvent.type(input, 'Do something');
    await userEvent.click(screen.getByTestId('chatPipelineSendButton'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('should disable input when no connector is selected', () => {
    render(<PipelineChatPanel {...defaultProps} connectorId={undefined} />);

    const input = screen.getByTestId('chatPipelineInput');
    expect(input).toBeDisabled();
  });

  it('should display validation badge for successful validation', async () => {
    mockMutateAsync.mockResolvedValue({
      updatedPipeline: { processors: [] },
      explanation: 'Done.',
      validationResults: {
        success_rate: 100,
        successful_samples: 10,
        failed_samples: 0,
        total_samples: 10,
        failure_details: [],
      },
    });

    render(<PipelineChatPanel {...defaultProps} />);

    await userEvent.type(screen.getByTestId('chatPipelineInput'), 'test');
    await userEvent.click(screen.getByTestId('chatPipelineSendButton'));

    await waitFor(() => {
      expect(screen.getByText(/100% success/)).toBeInTheDocument();
    });
  });
});
