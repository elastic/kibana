/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KindField } from './kind_field';
import { createFormWrapper } from '../../test_utils';

describe('KindField', () => {
  it('renders the checkbox label', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Track active and recovered state over time')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    expect(screen.getByText(/Enables lifecycle management/)).toBeInTheDocument();
  });

  it('is checked when kind is alert (default)', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('is unchecked when kind is signal', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'signal' }) });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('changes kind from alert to signal when unchecked', async () => {
    const user = userEvent.setup();
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('changes kind from signal to alert when checked', async () => {
    const user = userEvent.setup();
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'signal' }) });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});
