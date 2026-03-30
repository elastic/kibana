/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ResolveActionButton } from './deactivate_action_button';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);
const mockServices = { http: {} as any };

describe('ResolveActionButton', () => {
  const mutate = jest.fn();
  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as any);
  });

  it('renders Unresolve when not deactivated', () => {
    render(<ResolveActionButton lastDeactivateAction={null} http={mockServices.http} />);
    expect(screen.getByTestId('alertingEpisodeActionsResolveActionButton')).toHaveTextContent(
      'Unresolve'
    );
  });

  it('renders Resolve when deactivated', () => {
    render(
      <ResolveActionButton
        lastDeactivateAction={ALERT_EPISODE_ACTION_TYPE.DEACTIVATE}
        http={mockServices.http}
      />
    );
    expect(screen.getByTestId('alertingEpisodeActionsResolveActionButton')).toHaveTextContent(
      'Resolve'
    );
  });

  it('calls deactivate route mutation on click', async () => {
    const user = userEvent.setup();
    render(
      <ResolveActionButton lastDeactivateAction={null} groupHash="gh-1" http={mockServices.http} />
    );

    await user.click(screen.getByTestId('alertingEpisodeActionsResolveActionButton'));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
      body: { reason: 'Updated from episodes actions UI' },
    });
  });
});
