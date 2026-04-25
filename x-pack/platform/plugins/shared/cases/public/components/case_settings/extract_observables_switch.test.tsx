/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractObservablesSwitch } from './extract_observables_switch';

describe('ExtractObservablesSwitch', () => {
  it('it renders', () => {
    render(
      <ExtractObservablesSwitch disabled={false} isEnabled={false} onSwitchChange={jest.fn()} />
    );
    const toggle = screen.getByTestId('extract-observables-switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('it toggles the switch', async () => {
    render(
      <ExtractObservablesSwitch disabled={false} isEnabled={false} onSwitchChange={jest.fn()} />
    );
    const toggle = screen.getByTestId('extract-observables-switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('it disables the switch', async () => {
    render(
      <ExtractObservablesSwitch disabled={true} isEnabled={false} onSwitchChange={jest.fn()} />
    );

    expect(await screen.findByTestId('extract-observables-switch')).toHaveProperty(
      'disabled',
      true
    );
  });

  it('it start as off', async () => {
    render(
      <ExtractObservablesSwitch
        disabled={false}
        isEnabled={false}
        showLabel={true}
        onSwitchChange={jest.fn()}
      />
    );

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('it shows the correct labels', async () => {
    render(
      <ExtractObservablesSwitch
        disabled={false}
        isEnabled={true}
        showLabel={true}
        onSwitchChange={jest.fn()}
      />
    );

    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(screen.queryByText('Off')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('extract-observables-switch'));

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });
});
