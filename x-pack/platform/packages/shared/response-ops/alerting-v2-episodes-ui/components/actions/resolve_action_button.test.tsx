/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpStart } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeResolveActionButton } from './resolve_action_button';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';

jest.mock('../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);

const mockHttp: HttpStart = httpServiceMock.createStartContract();

describe('ResolveActionButton', () => {
  const mutate = jest.fn();
  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateAlertAction>);
  });

  it('renders Resolve when active', () => {
    render(<AlertEpisodeResolveActionButton lastDeactivateAction={null} http={mockHttp} />);
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('renders Unresolve when deactivated', () => {
    render(
      <AlertEpisodeResolveActionButton
        lastDeactivateAction={ALERT_EPISODE_ACTION_TYPE.DEACTIVATE}
        http={mockHttp}
      />
    );
    expect(screen.getByText('Unresolve')).toBeInTheDocument();
  });

  it('calls deactivate route mutation on click', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeResolveActionButton
        lastDeactivateAction={null}
        groupHash="gh-1"
        http={mockHttp}
      />
    );

    await user.click(screen.getByTestId('alertingEpisodeActionsResolveActionButton'));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
      body: { reason: 'Updated from episodes actions UI' },
    });
  });
});
