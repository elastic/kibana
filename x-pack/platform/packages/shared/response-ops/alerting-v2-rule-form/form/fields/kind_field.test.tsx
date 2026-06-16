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
  it('renders the Mode label', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('shows Alert selected when kind is alert (default)', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    expect(screen.getByTestId('kindField')).toHaveTextContent('Alert');
  });

  it('shows Signal selected when kind is signal', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'signal' }) });

    expect(screen.getByTestId('kindField')).toHaveTextContent('Signal');
  });

  it('shows both option descriptions in the dropdown', async () => {
    const user = userEvent.setup();
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    await user.click(screen.getByTestId('kindField'));

    expect(screen.getByText(/Tracks a problem across state changes/)).toBeInTheDocument();
    expect(screen.getByText(/Records each match as a data point/)).toBeInTheDocument();
  });

  it('changes kind from alert to signal when Signal is selected', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    await user.click(screen.getByTestId('kindField'));
    await user.click(screen.getByText('Signal'));

    expect(screen.getByTestId('kindField')).toHaveTextContent('Signal');
  });

  it('disables the select when disabled', () => {
    render(<KindField disabled />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    expect(screen.getByTestId('kindField')).toBeDisabled();
  });
});
