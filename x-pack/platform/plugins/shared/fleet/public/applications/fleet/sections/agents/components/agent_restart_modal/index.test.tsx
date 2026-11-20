/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostAgentRestart, sendPostBulkAgentRestart } from '../../../../hooks';

import { AgentRestartModal } from '.';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendPostAgentRestart: jest.fn().mockResolvedValue({}),
  sendPostBulkAgentRestart: jest.fn().mockResolvedValue({}),
  useStartServices: () => ({
    notifications: {
      toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
    },
  }),
}));

const mockSendPostAgentRestart = sendPostAgentRestart as jest.Mock;
const mockSendPostBulkAgentRestart = sendPostBulkAgentRestart as jest.Mock;

function makeAgent(id: string, hostname = 'host-1') {
  return {
    id,
    active: true,
    local_metadata: { host: { hostname } },
  } as any;
}

describe('AgentRestartModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendPostAgentRestart.mockResolvedValue({});
    mockSendPostBulkAgentRestart.mockResolvedValue({});
    mockAddSuccess.mockClear();
    mockAddError.mockClear();
  });

  function render(props: React.ComponentProps<typeof AgentRestartModal>) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<AgentRestartModal {...props} />);
  }

  it('shows hostname in single-agent description', () => {
    const { getByText } = render({
      agents: [makeAgent('agent-1', 'my-host')],
      agentCount: 1,
      onClose: jest.fn(),
    });

    expect(getByText(/my-host/)).toBeInTheDocument();
  });

  it('shows agent count in multi-agent description', () => {
    const { getByText } = render({
      agents: [makeAgent('agent-1'), makeAgent('agent-2')],
      agentCount: 2,
      onClose: jest.fn(),
    });

    expect(getByText(/2 agents/)).toBeInTheDocument();
  });

  it('calls sendPostAgentRestart for single agent on confirm', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: [makeAgent('agent-1')],
      agentCount: 1,
      onClose,
    });

    await act(async () => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostAgentRestart).toHaveBeenCalledWith('agent-1');
    expect(mockSendPostBulkAgentRestart).not.toHaveBeenCalled();
  });

  it('calls sendPostBulkAgentRestart for multiple agents on confirm', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: [makeAgent('agent-1'), makeAgent('agent-2')],
      agentCount: 2,
      onClose,
    });

    await act(async () => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkAgentRestart).toHaveBeenCalledWith({
      agents: ['agent-1', 'agent-2'],
      includeInactive: false,
    });
    expect(mockSendPostAgentRestart).not.toHaveBeenCalled();
  });

  it('calls sendPostBulkAgentRestart with kuery string', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: 'status:online',
      agentCount: 5,
      onClose,
    });

    await act(async () => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkAgentRestart).toHaveBeenCalledWith({
      agents: 'status:online',
      includeInactive: false,
    });
  });

  it('shows success toast and calls onClose after confirm', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: [makeAgent('agent-1')],
      agentCount: 1,
      onClose,
    });

    await act(async () => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockAddSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error toast and calls onClose on failure', async () => {
    mockSendPostAgentRestart.mockRejectedValue(new Error('network error'));
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: [makeAgent('agent-1')],
      agentCount: 1,
      onClose,
    });

    await act(async () => {
      fireEvent.click(getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    const { getByTestId } = render({
      agents: [makeAgent('agent-1')],
      agentCount: 1,
      onClose,
    });

    fireEvent.click(getByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalled();
    expect(mockSendPostAgentRestart).not.toHaveBeenCalled();
  });
});
