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

import { UnenrollInProgressActivityItem } from './unenroll_in_progress_activity_item';

const FUTURE_TIME = '2099-01-01T12:00:00.000Z';
const PAST_TIME = '2020-01-01T12:00:00.000Z';

const baseAction: ActionStatus = {
  actionId: 'unenroll-action-1',
  type: 'UNENROLL',
  status: 'IN_PROGRESS',
  nbAgentsActioned: 3,
  nbAgentsAck: 0,
  nbAgentsFailed: 0,
  nbAgentsActionCreated: 3,
  creationTime: '2099-01-01T11:00:00.000Z',
  startTime: FUTURE_TIME,
};

describe('UnenrollInProgressActivityItem', () => {
  let testRenderer: TestRenderer;

  const renderComponent = (
    action: ActionStatus,
    abortUnenroll = jest.fn().mockResolvedValue(undefined)
  ) =>
    testRenderer.render(
      <UnenrollInProgressActivityItem
        action={action}
        abortUnenroll={abortUnenroll}
        onClickViewAgents={jest.fn()}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  describe('scheduled (startTime in the future)', () => {
    it('renders the scheduled title with agent count', () => {
      const result = renderComponent(baseAction);
      expect(result.getByTestId('unenrollInProgressTitle').textContent).toContain(
        '3 agents scheduled to be unenrolled'
      );
    });

    it('uses singular "agent" for a single agent', () => {
      const result = renderComponent({ ...baseAction, nbAgentsActioned: 1, nbAgentsAck: 0 });
      expect(result.getByTestId('unenrollInProgressTitle').textContent).toContain(
        '1 agent scheduled to be unenrolled'
      );
    });

    it('renders the scheduled description', () => {
      const result = renderComponent(baseAction);
      expect(result.getByTestId('unenrollInProgressDescription').textContent).toContain(
        'Scheduled for'
      );
    });

    it('renders the grace period warning callout', () => {
      const result = renderComponent(baseAction);
      expect(result.getByTestId('unenrollGracePeriodWarning')).toBeInTheDocument();
    });

    it('renders the Cancel unenrollment button', () => {
      const result = renderComponent(baseAction);
      expect(result.getByTestId('abortUnenrollBtn')).toBeInTheDocument();
    });

    it('calls abortUnenroll when the cancel button is clicked', async () => {
      const abortUnenroll = jest.fn().mockResolvedValue(undefined);
      const result = renderComponent(baseAction, abortUnenroll);

      await act(async () => {
        fireEvent.click(result.getByTestId('abortUnenrollBtn'));
      });

      expect(abortUnenroll).toHaveBeenCalledWith(baseAction);
    });

    it('disables the button while aborting', async () => {
      let resolveAbort!: () => void;
      const abortUnenroll = jest.fn(() => new Promise<void>((resolve) => (resolveAbort = resolve)));
      const result = renderComponent(baseAction, abortUnenroll);

      act(() => {
        fireEvent.click(result.getByTestId('abortUnenrollBtn'));
      });

      // Button is disabled while the promise is pending
      expect(result.getByTestId('abortUnenrollBtn')).toBeDisabled();

      await act(async () => {
        resolveAbort();
      });

      expect(result.getByTestId('abortUnenrollBtn')).not.toBeDisabled();
    });
  });

  describe('in-progress (startTime in the past or absent)', () => {
    it('does not render the cancel button when startTime is in the past', () => {
      const result = renderComponent({ ...baseAction, startTime: PAST_TIME });
      expect(result.queryByTestId('abortUnenrollBtn')).not.toBeInTheDocument();
    });

    it('does not render the warning callout when startTime is in the past', () => {
      const result = renderComponent({ ...baseAction, startTime: PAST_TIME });
      expect(result.queryByTestId('unenrollGracePeriodWarning')).not.toBeInTheDocument();
    });

    it('does not render the cancel button when startTime is absent', () => {
      const { startTime: _, ...actionWithoutStartTime } = baseAction;
      const result = renderComponent(actionWithoutStartTime as ActionStatus);
      expect(result.queryByTestId('abortUnenrollBtn')).not.toBeInTheDocument();
    });

    it('renders the generic in-progress title when startTime is in the past', () => {
      const result = renderComponent({ ...baseAction, startTime: PAST_TIME });
      expect(result.getByTestId('unenrollInProgressTitle')).toBeInTheDocument();
      expect(result.getByTestId('unenrollInProgressTitle').textContent).not.toContain(
        'scheduled to be unenrolled'
      );
    });
  });
});
