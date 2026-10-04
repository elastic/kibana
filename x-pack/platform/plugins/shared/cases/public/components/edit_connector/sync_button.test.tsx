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
import { SyncButton } from './sync_button';

describe('SyncButton', () => {
  const onSync = jest.fn();
  const props = {
    isLoading: false,
    disabled: false,
    hasBeenPushed: true,
    connectorName: 'My SN connector',
    onSync,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs on click', async () => {
    renderWithTestingProviders(<SyncButton {...props} />);

    const button = screen.getByTestId('sync-from-external-service');
    expect(button).toHaveTextContent('Sync from My SN connector');
    await userEvent.click(button);

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('explains why syncing is unavailable before the first push', async () => {
    renderWithTestingProviders(<SyncButton {...props} hasBeenPushed={false} disabled />);

    const button = screen.getByTestId('sync-from-external-service');
    expect(button).toBeDisabled();

    // Disabled buttons have pointer-events: none; the tooltip anchor still receives the hover.
    await userEvent.setup({ pointerEventsCheck: 0 }).hover(button);

    expect(
      await screen.findByText('Push the case to My SN connector before syncing from it')
    ).toBeInTheDocument();
  });

  it('renders the outlined variant as a bordered button', () => {
    renderWithTestingProviders(<SyncButton {...props} variant="outlined" />);

    expect(screen.getByTestId('sync-from-external-service')).toHaveClass('euiButton');
  });
});
