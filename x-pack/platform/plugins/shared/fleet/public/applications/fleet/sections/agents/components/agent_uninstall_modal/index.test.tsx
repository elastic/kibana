/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostAgentUninstall, sendPostBulkAgentUninstall } from '../../../../hooks';

import { AgentUninstallModal } from '.';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendPostAgentUninstall: jest.fn().mockResolvedValue({}),
  sendPostBulkAgentUninstall: jest.fn().mockResolvedValue({}),
  useStartServices: () => ({
    notifications: {
      toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
    },
  }),
}));

const mockSendPostAgentUninstall = sendPostAgentUninstall as jest.Mock;
const mockSendPostBulkAgentUninstall = sendPostBulkAgentUninstall as jest.Mock;

const makeAgent = (id: string, hostname = 'host-1') =>
  ({ id, active: true, local_metadata: { host: { hostname } } } as any);

describe('AgentUninstallModal', () => {
  const renderModal = (props: React.ComponentProps<typeof AgentUninstallModal>) =>
    createFleetTestRendererMock().render(<AgentUninstallModal {...props} />);

  const setDelay = (result: ReturnType<typeof renderModal>, value: string) =>
    fireEvent.change(result.getByTestId('agentUninstallDelayInput'), { target: { value } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('describes the host for a single agent and defaults the grace period to 1 hour', () => {
    const result = renderModal({
      agents: [makeAgent('a1', 'my-host')],
      agentCount: 1,
      onClose: jest.fn(),
    });

    expect(result.getByTestId('agentUninstallModalDescription')).toHaveTextContent('my-host');
    expect(result.getByTestId('agentUninstallDelayInput')).toHaveValue(1);
    expect(result.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('shows the affected agent count for multiple agents', () => {
    const result = renderModal({
      agents: [makeAgent('a1'), makeAgent('a2')],
      agentCount: 2,
      onClose: jest.fn(),
    });

    expect(result.getByTestId('agentUninstallModalDescription')).toHaveTextContent(
      'This will affect 2 agents'
    );
  });

  it('sends the single agent request with the default delay in seconds', async () => {
    const onClose = jest.fn();
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose });

    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSendPostAgentUninstall).toHaveBeenCalledWith('a1', { delay_seconds: 3600 });
    expect(mockSendPostBulkAgentUninstall).not.toHaveBeenCalled();
    expect(mockAddSuccess).toHaveBeenCalled();
  });

  it('sends a custom delay converted to seconds', async () => {
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose: jest.fn() });

    setDelay(result, '6');
    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostAgentUninstall).toHaveBeenCalledWith('a1', { delay_seconds: 21600 });
  });

  it('sends the bulk request with agent ids', async () => {
    const result = renderModal({
      agents: [makeAgent('a1'), makeAgent('a2')],
      agentCount: 2,
      onClose: jest.fn(),
    });

    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkAgentUninstall).toHaveBeenCalledWith({
      agents: ['a1', 'a2'],
      delay_seconds: 3600,
      includeInactive: false,
    });
    expect(mockSendPostAgentUninstall).not.toHaveBeenCalled();
  });

  it('sends the bulk request with a kuery when agents is a query string', async () => {
    const result = renderModal({ agents: 'status:online', agentCount: 40, onClose: jest.fn() });

    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkAgentUninstall).toHaveBeenCalledWith({
      agents: 'status:online',
      delay_seconds: 3600,
      includeInactive: false,
    });
  });

  it.each(['0', '25', '-1', '1.5', ''])(
    'disables the confirm button and shows an error for the invalid delay %p',
    (value) => {
      const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose: jest.fn() });

      setDelay(result, value);

      expect(result.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      expect(result.getByText(/between 1 and 24/)).toBeInTheDocument();
    }
  );

  it.each(['1', '24'])('accepts the boundary delay %p', (value) => {
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose: jest.fn() });

    setDelay(result, value);

    expect(result.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('does not call the API for an invalid delay', async () => {
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose: jest.fn() });

    setDelay(result, '48');
    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostAgentUninstall).not.toHaveBeenCalled();
  });

  it('shows an error toast and closes when the request fails', async () => {
    mockSendPostAgentUninstall.mockRejectedValueOnce(new Error('boom'));
    const onClose = jest.fn();
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose });

    await act(async () => {
      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockAddError).toHaveBeenCalled();
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('calls onClose without sending anything when cancelled', () => {
    const onClose = jest.fn();
    const result = renderModal({ agents: [makeAgent('a1')], agentCount: 1, onClose });

    fireEvent.click(result.getByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalled();
    expect(mockSendPostAgentUninstall).not.toHaveBeenCalled();
  });
});
