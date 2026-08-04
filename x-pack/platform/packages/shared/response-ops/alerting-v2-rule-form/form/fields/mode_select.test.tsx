/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelect } from './mode_select';

const getOptionRadio = (testSubj: string) =>
  within(screen.getByTestId(testSubj)).getByRole('radio');

describe('ModeSelect', () => {
  it('renders the Mode label and radio-style cards for each kind', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2ModeSelect')).toBeInTheDocument();
    expect(getOptionRadio('ruleV2ModeSelect-alert')).toBeChecked();
    expect(getOptionRadio('ruleV2ModeSelect-signal')).not.toBeChecked();
  });

  it('calls onChange with the selected kind', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<ModeSelect value="alert" onChange={onChange} />);

    await user.click(getOptionRadio('ruleV2ModeSelect-signal'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('honors a custom data-test-subj', () => {
    render(<ModeSelect value="signal" onChange={jest.fn()} data-test-subj="customMode" />);

    expect(screen.getByTestId('customMode')).toBeInTheDocument();
    expect(getOptionRadio('customMode-signal')).toBeChecked();
  });

  it('disables the cards when disabled', () => {
    render(<ModeSelect value="alert" onChange={jest.fn()} disabled />);

    expect(getOptionRadio('ruleV2ModeSelect-alert')).toBeDisabled();
    expect(getOptionRadio('ruleV2ModeSelect-signal')).toBeDisabled();
  });
});
