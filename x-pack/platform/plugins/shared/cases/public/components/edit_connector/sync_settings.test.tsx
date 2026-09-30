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
  const settings = { syncAlerts: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auto-push off and external-wins when the case has no sync settings', () => {
    renderWithTestingProviders(
      <SyncSettings settings={settings} disabled={false} onChange={onChange} />
    );

    expect(screen.getByTestId('connector-auto-push-switch')).not.toBeChecked();
    expect(screen.getByTestId('connector-conflict-strategy-select')).toHaveValue('external');
  });

  it('turns auto-push on and keeps the other settings', async () => {
    renderWithTestingProviders(
      <SyncSettings settings={settings} disabled={false} onChange={onChange} />
    );

    await userEvent.click(screen.getByTestId('connector-auto-push-switch'));

    expect(onChange).toHaveBeenCalledWith({
      syncAlerts: true,
      externalSync: { autoPush: true, conflictStrategy: 'external' },
    });
  });

  it('changes the conflict strategy', async () => {
    renderWithTestingProviders(
      <SyncSettings
        settings={{ ...settings, externalSync: { autoPush: true, conflictStrategy: 'external' } }}
        disabled={false}
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(
      screen.getByTestId('connector-conflict-strategy-select'),
      'kibana'
    );

    expect(onChange).toHaveBeenCalledWith({
      syncAlerts: true,
      externalSync: { autoPush: true, conflictStrategy: 'kibana' },
    });
  });

  it('disables both controls while the case is saving', () => {
    renderWithTestingProviders(<SyncSettings settings={settings} disabled onChange={onChange} />);

    expect(screen.getByTestId('connector-auto-push-switch')).toBeDisabled();
    expect(screen.getByTestId('connector-conflict-strategy-select')).toBeDisabled();
  });
});
