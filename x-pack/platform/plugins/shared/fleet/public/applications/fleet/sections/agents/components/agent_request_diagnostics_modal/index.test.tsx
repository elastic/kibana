/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostRequestDiagnostics, sendPostBulkRequestDiagnostics } from '../../../../hooks';

import { AgentRequestDiagnosticsModal } from '.';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    sendPostRequestDiagnostics: jest.fn().mockResolvedValue({}),
    sendPostBulkRequestDiagnostics: jest.fn().mockResolvedValue({}),
  };
});

const mockSendPostRequestDiagnostics = sendPostRequestDiagnostics as jest.Mock;
const mockSendPostBulkRequestDiagnostics = sendPostBulkRequestDiagnostics as jest.Mock;

describe('AgentRequestDiagnosticsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function render(props: any = {}) {
    const renderer = createFleetTestRendererMock();

    const utils = renderer.render(
      <AgentRequestDiagnosticsModal
        onClose={jest.fn()}
        agents={[{ id: 'agent1' } as any]}
        agentCount={1}
        {...props}
      />
    );

    return { utils };
  }

  it('should include CPU option when checkbox is checked', async () => {
    const { utils } = render();

    act(() => {
      fireEvent.click(utils.getByTestId('cpuMetricsCheckbox'));
    });
    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostRequestDiagnostics).toHaveBeenCalledWith('agent1', {
      additional_metrics: ['CPU'],
    });
  });

  it('should not include CPU option when checkbox is not checked', async () => {
    const { utils } = render();

    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostRequestDiagnostics).toHaveBeenCalledWith('agent1', {
      additional_metrics: [],
    });
  });

  it('should include CPU option when checkbox is checked when bulk action', async () => {
    const { utils } = render({ agents: [{ id: 'agent1' }, { id: 'agent2' }], agentCount: 2 });

    act(() => {
      fireEvent.click(utils.getByTestId('cpuMetricsCheckbox'));
    });
    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkRequestDiagnostics).toHaveBeenCalledWith({
      additional_metrics: ['CPU'],
      agents: ['agent1', 'agent2'],
    });
  });

  it('should not include CPU option when checkbox is checked when bulk action', async () => {
    const { utils } = render({ agents: [{ id: 'agent1' }, { id: 'agent2' }], agentCount: 2 });

    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    expect(mockSendPostBulkRequestDiagnostics).toHaveBeenCalledWith({
      additional_metrics: [],
      agents: ['agent1', 'agent2'],
    });
  });
});
