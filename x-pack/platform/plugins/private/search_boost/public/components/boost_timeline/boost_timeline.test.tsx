/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataStreamsBoostProfile } from '../../../common/types';
import { BoostTimeline } from './boost_timeline';

const profile: DataStreamsBoostProfile = {
  name: 'logs',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 5000, max_age: '7d' },
  standard: { min_boost: 1, max_boost: 10, max_age: '30d' },
  background: { min_boost: 0, max_boost: 1 },
};

describe('BoostTimeline', () => {
  it('shows the periods with their boundary ages and no end label', () => {
    render(<BoostTimeline profile={profile} />);

    expect(screen.getByTestId('searchBoostTimeline-period-recent')).toHaveTextContent('Recent');
    expect(screen.getByTestId('searchBoostTimeline-period-standard')).toHaveTextContent('Standard');
    expect(screen.getByTestId('searchBoostTimeline-period-background')).toHaveTextContent(
      'Background'
    );
    expect(screen.getByTestId('searchBoostTimeline-tick-standard')).toHaveTextContent('7d');
    expect(screen.getByTestId('searchBoostTimeline-tick-background')).toHaveTextContent('30d');
    expect(screen.queryByTestId('searchBoostTimeline-retention')).not.toBeInTheDocument();
  });

  it('leaves skipped periods out', () => {
    render(
      <BoostTimeline profile={{ ...profile, standard: { ...profile.standard, max_age: '7d' } }} />
    );

    expect(screen.queryByTestId('searchBoostTimeline-period-standard')).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBoostTimeline-tick-background')).toHaveTextContent('7d');
  });

  it('shows the boost of a period in its tooltip', async () => {
    render(<BoostTimeline profile={profile} />);

    await userEvent.hover(screen.getByTestId('searchBoostTimeline-period-recent'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('2–5,000 boost');
  });
});
