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
import { AcknowledgeActionButton } from './acknowledge_action_button';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);
const mockServices = { http: {} as any };

describe('AcknowledgeActionButton', () => {
  const mutate = jest.fn();
  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as any);
  });

  it('renders Acknowledge when lastAckAction is undefined (same as not acknowledged)', () => {
    render(<AcknowledgeActionButton http={mockServices.http} />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Acknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="checkCircle"]')
    ).toBeInTheDocument();
  });

  it('renders Unacknowledge when lastAckAction is ack', () => {
    render(
      <AcknowledgeActionButton
        lastAckAction={ALERT_EPISODE_ACTION_TYPE.ACK}
        http={mockServices.http}
      />
    );
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Unacknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="crossCircle"]')
    ).toBeInTheDocument();
  });

  it('renders Acknowledge when lastAckAction is unack', () => {
    render(
      <AcknowledgeActionButton
        lastAckAction={ALERT_EPISODE_ACTION_TYPE.UNACK}
        http={mockServices.http}
      />
    );
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Acknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="checkCircle"]')
    ).toBeInTheDocument();
  });

  it('calls ack route mutation on click', async () => {
    const user = userEvent.setup();
    render(
      <AcknowledgeActionButton
        lastAckAction={ALERT_EPISODE_ACTION_TYPE.UNACK}
        episodeId="ep-1"
        groupHash="gh-1"
        http={mockServices.http}
      />
    );

    await user.click(screen.getByTestId('alertEpisodeAcknowledgeActionButton'));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      body: { episode_id: 'ep-1' },
    });
  });
});
