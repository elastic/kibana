/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import { sendPostAgentAction, useAuthz, useStartServices } from '../../../../../hooks';

import { SelectLogLevel } from './select_log_level';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useAuthz: jest.fn(),
    useStartServices: jest.fn(),
    sendPostAgentAction: jest.fn(),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;
const mockSendPostAgentAction = sendPostAgentAction as jest.Mock;

const createAgent = (logLevel?: string) =>
  ({
    id: 'agent1',
    local_metadata: {
      elastic: {
        agent: {
          version: '8.15.0',
          ...(logLevel !== undefined ? { log_level: logLevel } : {}),
        },
      },
    },
  } as any);

describe('SelectLogLevel', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
      },
    } as any);
    mockUseStartServices.mockReturnValue({
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {
            agentLevelLogging: 'https://docs.example.com/agent-logging',
          },
        },
      },
    });
    mockSendPostAgentAction.mockResolvedValue({});
  });

  const renderComponent = (props: React.ComponentProps<typeof SelectLogLevel>) => {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<SelectLogLevel {...props} />);
  };

  it('renders the dropdown at the agent reported log level', () => {
    const result = renderComponent({
      agent: createAgent('debug'),
      agentPolicyLogLevel: 'warning',
    });

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('debug');
  });

  it('falls back to agentPolicyLogLevel when metadata log level is missing', () => {
    const result = renderComponent({
      agent: createAgent(),
      agentPolicyLogLevel: 'warning',
    });

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('warning');
  });

  it('updates the dropdown when polled agent metadata changes', () => {
    const result = renderComponent({
      agent: createAgent('info'),
      agentPolicyLogLevel: 'warning',
    });

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('info');

    result.rerender(<SelectLogLevel agent={createAgent('debug')} agentPolicyLogLevel="warning" />);

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('debug');
  });

  it('does not revert the dropdown when a stale poll arrives during apply', async () => {
    let resolveApply: (value: unknown) => void;
    mockSendPostAgentAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApply = resolve;
        })
    );

    const result = renderComponent({
      agent: createAgent('warning'),
      agentPolicyLogLevel: 'warning',
    });

    fireEvent.change(result.getByTestId('selectAgentLogLevel'), {
      target: { value: 'debug' },
    });

    await waitFor(() => {
      expect(mockSendPostAgentAction).toHaveBeenCalledTimes(1);
      expect(mockSendPostAgentAction).toHaveBeenCalledWith('agent1', {
        action: {
          type: 'SETTINGS',
          data: {
            log_level: 'debug',
          },
        },
      });
    });

    result.rerender(
      <SelectLogLevel agent={createAgent('warning')} agentPolicyLogLevel="warning" />
    );

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('debug');

    resolveApply!({});
    await waitFor(() => {
      expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('debug');
    });

    expect(mockSendPostAgentAction).toHaveBeenCalledTimes(1);
  });

  it('resets to policy and sends SETTINGS with log_level null', async () => {
    const result = renderComponent({
      agent: createAgent('info'),
      agentPolicyLogLevel: 'warning',
    });

    await userEvent.click(result.getByTestId('resetLogLevelBtn'));

    await waitFor(() => {
      expect(mockSendPostAgentAction).toHaveBeenCalledWith('agent1', {
        action: {
          type: 'SETTINGS',
          data: {
            log_level: null,
          },
        },
      });
    });

    expect(result.getByTestId('selectAgentLogLevel')).toHaveValue('warning');
  });
});
