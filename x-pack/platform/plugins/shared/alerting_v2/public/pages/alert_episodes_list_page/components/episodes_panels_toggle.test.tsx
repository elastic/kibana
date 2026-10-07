/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodesPanelsToggle } from './episodes_panels_toggle';

describe('EpisodesPanelsToggle', () => {
  it('toggles KPIs and visualization independently', async () => {
    const user = userEvent.setup();
    const onToggleKpis = jest.fn();
    const onToggleHistogram = jest.fn();

    render(
      <EpisodesPanelsToggle
        isKpisHidden={false}
        isHistogramHidden={false}
        onToggleKpis={onToggleKpis}
        onToggleHistogram={onToggleHistogram}
      />
    );

    expect(screen.getByTestId('episodesPanelsToggle')).toBeInTheDocument();
    await user.click(screen.getByTestId('episodesHideKpisButton'));
    expect(onToggleKpis).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('episodesHideHistogramButton'));
    expect(onToggleHistogram).toHaveBeenCalledTimes(1);
  });

  it('shows restore controls when panels are hidden', () => {
    render(
      <EpisodesPanelsToggle
        isKpisHidden
        isHistogramHidden
        onToggleKpis={jest.fn()}
        onToggleHistogram={jest.fn()}
      />
    );

    expect(screen.getByTestId('episodesShowKpisButton')).toBeInTheDocument();
    expect(screen.getByTestId('episodesShowHistogramButton')).toBeInTheDocument();
  });
});
