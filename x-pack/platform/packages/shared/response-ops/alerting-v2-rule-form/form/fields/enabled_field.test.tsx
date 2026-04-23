/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnabledField } from './enabled_field';
import { createFormWrapper } from '../../test_utils';

describe('EnabledField', () => {
  it('renders the enabled label', () => {
    render(<EnabledField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('renders help text', () => {
    render(<EnabledField />, { wrapper: createFormWrapper() });

    expect(
      screen.getByText('When enabled, the rule will run on the defined schedule.')
    ).toBeInTheDocument();
  });

  it('renders a switch control', () => {
    render(<EnabledField />, { wrapper: createFormWrapper() });

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('shows "On" label when enabled is true', () => {
    render(<EnabledField />, {
      wrapper: createFormWrapper({
        metadata: { name: '', enabled: true },
      }),
    });

    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('shows "Off" label when enabled is false', () => {
    render(<EnabledField />, {
      wrapper: createFormWrapper({
        metadata: { name: '', enabled: false },
      }),
    });

    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('switch is checked when enabled is true', () => {
    render(<EnabledField />, {
      wrapper: createFormWrapper({
        metadata: { name: '', enabled: true },
      }),
    });

    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('switch is unchecked when enabled is false', () => {
    render(<EnabledField />, {
      wrapper: createFormWrapper({
        metadata: { name: '', enabled: false },
      }),
    });

    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('toggles value when clicked', () => {
    render(<EnabledField />, {
      wrapper: createFormWrapper({
        metadata: { name: '', enabled: true },
      }),
    });

    const switchControl = screen.getByRole('switch');
    expect(switchControl).toBeChecked();

    fireEvent.click(switchControl);

    expect(switchControl).not.toBeChecked();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});
