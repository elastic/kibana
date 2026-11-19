/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StatsProblemIcon } from './stats_problem_icon';

describe('StatsProblemIcon', () => {
  it('says that a refresh failed, and that the values are the last known ones, for stale', async () => {
    render(<StatsProblemIcon problem="stale" dataTestSubj="icon" />);

    fireEvent.mouseOver(screen.getByTestId('icon'));

    expect(
      await screen.findByText('Could not refresh. Showing the last known values.')
    ).toBeTruthy();
  });

  it('says that the stats could not be loaded, with the reason, for an error', async () => {
    render(
      <StatsProblemIcon problem="error" reason="Elasticsearch is unavailable" dataTestSubj="icon" />
    );

    fireEvent.mouseOver(screen.getByTestId('icon'));

    expect(
      await screen.findByText('Could not load stats. Elasticsearch is unavailable')
    ).toBeTruthy();
  });

  it('says that some stats could not be loaded, with the reason, for a partial problem', async () => {
    render(
      <StatsProblemIcon problem="partial" reason="The stats query failed." dataTestSubj="icon" />
    );

    fireEvent.mouseOver(screen.getByTestId('icon'));

    expect(
      await screen.findByText('Some stats could not be loaded. The stats query failed.')
    ).toBeTruthy();
  });
});
