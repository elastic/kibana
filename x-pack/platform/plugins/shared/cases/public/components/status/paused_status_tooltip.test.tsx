/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';
import { PausedStatusTooltip } from './paused_status_tooltip';

describe('PausedStatusTooltip', () => {
  it('renders the child alone when the case is not paused', async () => {
    renderWithTestingProviders(
      <PausedStatusTooltip pausedAt={null} pauseReason={null}>
        <span data-test-subj="child">{'On hold'}</span>
      </PausedStatusTooltip>
    );

    await userEvent.hover(screen.getByTestId('child'));

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the reason and how long the case has been paused on hover', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    renderWithTestingProviders(
      <PausedStatusTooltip pausedAt={fiveMinutesAgo} pauseReason="Awaiting vendor">
        <span data-test-subj="child">{'On hold'}</span>
      </PausedStatusTooltip>
    );

    await userEvent.hover(screen.getByTestId('child'));

    expect(await screen.findByText(/Awaiting vendor · paused/)).toBeInTheDocument();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
