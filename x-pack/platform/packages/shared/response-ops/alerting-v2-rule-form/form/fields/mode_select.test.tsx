/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelect } from './mode_select';

// Failing: See https://github.com/elastic/kibana/issues/277206
describe.skip('ModeSelect', () => {
  it('renders the field label and both options', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByText("What's your goal?")).toBeInTheDocument();
    expect(screen.getByText('Detect and respond')).toBeInTheDocument();
    expect(screen.getByText('Collect evidence')).toBeInTheDocument();
  });

  it('calls onChange with signal when signal card is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<ModeSelect value="alert" onChange={onChange} />);

    await user.click(screen.getByTestId('modeSelectSignalCard'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('calls onChange with alert when alert card is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<ModeSelect value="signal" onChange={onChange} />);

    await user.click(screen.getByTestId('modeSelectAlertCard'));

    expect(onChange).toHaveBeenCalledWith('alert');
  });

  it('disables both cards when disabled', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('modeSelectAlertCard')).toBeDisabled();
    expect(screen.getByTestId('modeSelectSignalCard')).toBeDisabled();
  });
});
