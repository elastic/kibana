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
  it('it renders', async () => {
    render(<ExtractObservablesSwitch disabled={false} />);

    expect(await screen.findByTestId('extract-observables-switch')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    render(<ExtractObservablesSwitch disabled={false} />);

    await userEvent.click(await screen.findByTestId('extract-observables-switch'));

    expect(await screen.findByTestId('extract-observables-switch')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('it disables the switch', async () => {
    render(<ExtractObservablesSwitch disabled={true} />);

    expect(await screen.findByTestId('extract-observables-switch')).toHaveProperty(
      'disabled',
      true
    );
  });

  it('it start as off', async () => {
    render(<ExtractObservablesSwitch disabled={false} isExtracted={false} showLabel={true} />);

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('it shows the correct labels', async () => {
    render(<ExtractObservablesSwitch disabled={false} showLabel={true} />);

    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(screen.queryByText('Off')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('extract-observables-switch'));

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });
});
