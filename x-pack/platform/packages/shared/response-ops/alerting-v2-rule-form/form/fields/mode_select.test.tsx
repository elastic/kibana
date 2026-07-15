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

describe('ModeSelect', () => {
  it('renders the Mode label and the selected value', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2ModeSelect')).toHaveTextContent('Alert');
  });

  it('calls onChange with the selected kind', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<ModeSelect value="alert" onChange={onChange} />);

    await user.click(screen.getByTestId('ruleV2ModeSelect'));
    await user.click(screen.getByText('Signal'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('honors a custom data-test-subj', () => {
    render(<ModeSelect value="signal" onChange={jest.fn()} data-test-subj="customMode" />);

    expect(screen.getByTestId('customMode')).toHaveTextContent('Signal');
  });

  it('disables the select when disabled', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('ruleV2ModeSelect')).toBeDisabled();
  });
});
