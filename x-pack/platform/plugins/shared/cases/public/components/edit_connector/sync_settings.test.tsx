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
import { SyncSettings } from './sync_settings';

describe('SyncSettings', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auto-push off and external-wins when there is no value', () => {
    renderWithTestingProviders(<SyncSettings disabled={false} onChange={onChange} />);

    expect(screen.getByTestId('connector-auto-push-switch')).not.toBeChecked();
    expect(screen.getByTestId('connector-conflict-strategy-select')).toHaveValue('external');
  });

  it('turns auto-push on and keeps the conflict strategy', async () => {
    renderWithTestingProviders(<SyncSettings disabled={false} onChange={onChange} />);

    await userEvent.click(screen.getByTestId('connector-auto-push-switch'));

    expect(onChange).toHaveBeenCalledWith({ autoPush: true, conflictStrategy: 'external' });
  });

  it('changes the conflict strategy and keeps auto-push', async () => {
    renderWithTestingProviders(
      <SyncSettings
        value={{ autoPush: true, conflictStrategy: 'external' }}
        disabled={false}
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(
      screen.getByTestId('connector-conflict-strategy-select'),
      'kibana'
    );

    expect(onChange).toHaveBeenCalledWith({ autoPush: true, conflictStrategy: 'kibana' });
  });

  it('disables both controls', () => {
    renderWithTestingProviders(<SyncSettings disabled onChange={onChange} />);

    expect(screen.getByTestId('connector-auto-push-switch')).toBeDisabled();
    expect(screen.getByTestId('connector-conflict-strategy-select')).toBeDisabled();
  });
});
