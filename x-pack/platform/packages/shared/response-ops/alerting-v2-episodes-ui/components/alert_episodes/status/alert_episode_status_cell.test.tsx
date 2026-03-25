/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertEpisodeStatusCell } from './alert_episode_status_cell';

describe('AlertEpisodeStatusCell', () => {
  it('renders status badge only when no action indicators', () => {
    const { getByText, container } = render(<AlertEpisodeStatusCell status="active" />);
    expect(getByText('Active')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="bell"]')).not.toBeInTheDocument();
  });

  it('renders snoozed bell when last snooze action is snooze', () => {
    const { container } = render(
      <AlertEpisodeStatusCell
        status="active"
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: null,
          lastSnoozeAction: 'snooze',
          lastDeactivateAction: null,
          tags: null,
        }}
      />
    );
    expect(container.querySelector('[data-euiicon-type="bell"]')).toBeInTheDocument();
  });

  it('renders check icon when acknowledged', () => {
    const { container } = render(
      <AlertEpisodeStatusCell
        status="active"
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: 'ack',
          lastSnoozeAction: null,
          lastDeactivateAction: null,
          tags: null,
        }}
      />
    );
    expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeInTheDocument();
  });
});
