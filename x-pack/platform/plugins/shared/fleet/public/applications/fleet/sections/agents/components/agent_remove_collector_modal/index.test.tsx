/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostRemoveCollector, sendPostBulkRemoveCollectors } from '../../../../hooks';

import { AgentRemoveCollectorModal } from '.';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendPostRemoveCollector: jest.fn().mockResolvedValue({}),
  sendPostBulkRemoveCollectors: jest.fn().mockResolvedValue({}),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
}));

const mockSendPostRemoveCollector = sendPostRemoveCollector as jest.Mock;
const mockSendPostBulkRemoveCollectors = sendPostBulkRemoveCollectors as jest.Mock;

describe('AgentRemoveCollectorModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function render(props: Partial<React.ComponentProps<typeof AgentRemoveCollectorModal>> = {}) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(
      <AgentRemoveCollectorModal
        onClose={mockOnClose}
        agents={[{ id: 'collector-1' } as any]}
        agentCount={1}
        {...props}
      />
    );
  }

  it('renders single-collector title and description', () => {
    const { getAllByText, getByText } = render();
    expect(getAllByText('Remove collector').length).toBeGreaterThanOrEqual(1);
    expect(
      getByText(/This will remove the selected collector from the Fleet list/)
    ).toBeInTheDocument();
  });

  it('renders multi-collector title and description', () => {
    const { getAllByText, getByText } = render({
      agents: [{ id: 'collector-1' } as any, { id: 'collector-2' } as any],
      agentCount: 2,
    });
    expect(getAllByText('Remove 2 collectors').length).toBeGreaterThanOrEqual(1);
    expect(
      getByText(/This will remove the selected collectors from the Fleet list/)
    ).toBeInTheDocument();
  });

  it('calls sendPostRemoveCollector with the agent id on single confirm', async () => {
    const { getByTestId } = render();

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockSendPostRemoveCollector).toHaveBeenCalledWith('collector-1');
      expect(mockSendPostBulkRemoveCollectors).not.toHaveBeenCalled();
    });
  });

  it('calls sendPostBulkRemoveCollectors with all agent ids on bulk confirm', async () => {
    const { getByTestId } = render({
      agents: [{ id: 'collector-1' } as any, { id: 'collector-2' } as any],
      agentCount: 2,
    });

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockSendPostBulkRemoveCollectors).toHaveBeenCalledWith({
        agents: ['collector-1', 'collector-2'],
        includeInactive: true,
      });
      expect(mockSendPostRemoveCollector).not.toHaveBeenCalled();
    });
  });

  it('calls sendPostBulkRemoveCollectors with kuery string when agents is a string', async () => {
    const { getByTestId } = render({
      agents: 'type:OPAMP',
      agentCount: 5,
    });

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockSendPostBulkRemoveCollectors).toHaveBeenCalledWith({
        agents: 'type:OPAMP',
        includeInactive: true,
      });
    });
  });

  it('calls onClose after successful single removal', async () => {
    const { getByTestId } = render();

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose after successful bulk removal', async () => {
    const { getByTestId } = render({
      agents: [{ id: 'collector-1' } as any, { id: 'collector-2' } as any],
      agentCount: 2,
    });

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const { getByTestId } = render();

    fireEvent.click(getByTestId('confirmModalCancelButton'));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockSendPostRemoveCollector).not.toHaveBeenCalled();
  });

  it('shows error toast and does not close on API failure', async () => {
    const mockAddError = jest.fn();
    const { useStartServices } = jest.requireMock('../../../../hooks');
    useStartServices.mockReturnValue({
      notifications: { toasts: { addSuccess: jest.fn(), addError: mockAddError } },
    });
    mockSendPostRemoveCollector.mockRejectedValueOnce(new Error('network error'));

    const { getByTestId } = render();

    act(() => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
