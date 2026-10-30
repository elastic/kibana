/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import type { ActionStatus } from '../../../../../types';

import { UninstallInProgressActivityItem } from './uninstall_in_progress_activity_item';

const FUTURE_TIME = '2099-01-01T12:00:00.000Z';

const baseAction: ActionStatus = {
  actionId: 'uninstall-action-1',
  type: 'UNINSTALL',
  status: 'IN_PROGRESS',
  nbAgentsActioned: 3,
  nbAgentsAck: 0,
  nbAgentsFailed: 0,
  nbAgentsActionCreated: 3,
  creationTime: '2099-01-01T11:00:00.000Z',
  startTime: FUTURE_TIME,
};

describe('UninstallInProgressActivityItem', () => {
  let testRenderer: TestRenderer;

  const renderComponent = (
    action: ActionStatus,
    abortUninstall = jest.fn().mockResolvedValue(undefined)
  ) =>
    testRenderer.render(
      <UninstallInProgressActivityItem
        action={action}
        abortUninstall={abortUninstall}
        onClickViewAgents={jest.fn()}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('renders the uninstall pending title with the agent count', () => {
    const result = renderComponent(baseAction);
    expect(result.getByTestId('uninstallPendingTitle').textContent).toContain(
      'Uninstall pending: 3 agents'
    );
  });

  it('uses the singular form for a single agent', () => {
    const result = renderComponent({ ...baseAction, nbAgentsActioned: 1 });
    expect(result.getByTestId('uninstallPendingTitle').textContent).toContain(
      'Uninstall pending: 1 agent'
    );
  });

  it('renders the scheduled execution time', () => {
    const result = renderComponent(baseAction);
    expect(result.getByTestId('uninstallPendingDescription').textContent).toContain(
      'Scheduled for'
    );
  });

  it('renders the grace period warning callout', () => {
    const result = renderComponent(baseAction);
    expect(result.getByTestId('uninstallGracePeriodWarning')).toBeInTheDocument();
  });

  it('calls abortUninstall when the cancel button is clicked', async () => {
    const abortUninstall = jest.fn().mockResolvedValue(undefined);
    const result = renderComponent(baseAction, abortUninstall);

    await act(async () => {
      fireEvent.click(result.getByTestId('abortUninstallBtn'));
    });

    expect(abortUninstall).toHaveBeenCalledWith(baseAction);
  });

  it('disables the cancel button while aborting', async () => {
    let resolveAbort!: () => void;
    const abortUninstall = jest.fn(() => new Promise<void>((resolve) => (resolveAbort = resolve)));
    const result = renderComponent(baseAction, abortUninstall);

    act(() => {
      fireEvent.click(result.getByTestId('abortUninstallBtn'));
    });
    expect(result.getByTestId('abortUninstallBtn')).toBeDisabled();

    await act(async () => {
      resolveAbort();
    });
    expect(result.getByTestId('abortUninstallBtn')).not.toBeDisabled();
  });
});
