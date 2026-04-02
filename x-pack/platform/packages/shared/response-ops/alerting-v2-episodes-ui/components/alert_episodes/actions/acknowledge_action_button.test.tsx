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
import { AcknowledgeActionButton } from './acknowledge_action_button';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);

const mockHttp: HttpStart = httpServiceMock.createStartContract();

describe('AcknowledgeActionButton', () => {
  const mutate = jest.fn();
  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateAlertAction>);
  });

  it('renders Acknowledge when lastAckAction is undefined (same as not acknowledged)', () => {
    render(<AcknowledgeActionButton http={mockHttp} />);
    expect(screen.getByText('Acknowledge')).toBeInTheDocument();
  });

  it('renders Unacknowledge when lastAckAction is ack', () => {
    render(
      <AcknowledgeActionButton lastAckAction={ALERT_EPISODE_ACTION_TYPE.ACK} http={mockHttp} />
    );
    expect(screen.getByText('Unacknowledge')).toBeInTheDocument();
  });

  it('renders Acknowledge when lastAckAction is unack', () => {
    render(
      <AcknowledgeActionButton lastAckAction={ALERT_EPISODE_ACTION_TYPE.UNACK} http={mockHttp} />
    );
    expect(screen.getByText('Acknowledge')).toBeInTheDocument();
  });

  it('calls ack route mutation on click', async () => {
    const user = userEvent.setup();
    render(
      <AcknowledgeActionButton
        lastAckAction={ALERT_EPISODE_ACTION_TYPE.UNACK}
        episodeId="ep-1"
        groupHash="gh-1"
        http={mockHttp}
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
