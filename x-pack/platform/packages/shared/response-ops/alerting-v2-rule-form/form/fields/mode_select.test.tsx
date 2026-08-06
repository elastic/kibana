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
  it('renders the goal label and both mode cards', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByText("What's your goal?")).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2ModeSelect-alert')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2ModeSelect-signal')).toBeInTheDocument();
    expect(screen.getByText('Detect and respond')).toBeInTheDocument();
    expect(screen.getByText('Collect evidence')).toBeInTheDocument();
  });

  it('calls onChange with the selected kind', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<ModeSelect value="alert" onChange={onChange} />);

    await user.click(screen.getByTestId('ruleV2ModeSelect-signal'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('honors a custom data-test-subj', () => {
    render(<ModeSelect value="signal" onChange={jest.fn()} data-test-subj="customMode" />);

    expect(screen.getByTestId('customMode')).toBeInTheDocument();
    expect(screen.getByTestId('customMode-signal')).toBeInTheDocument();
  });

  it('disables the cards when disabled', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('ruleV2ModeSelect-alert').querySelector('input')).toBeDisabled();
    expect(screen.getByTestId('ruleV2ModeSelect-signal').querySelector('input')).toBeDisabled();
  });

  it('renders only the selected card when readOnly', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} readOnly />);

    expect(screen.getByTestId('ruleV2ModeSelect-alert')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleV2ModeSelect-signal')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2ModeSelect-alert').querySelector('input')).toBeDisabled();
  });
});
