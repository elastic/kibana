/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KindSelect } from './kind_select';

describe('KindSelect', () => {
  it('renders the goal label and both kind cards', () => {
    render(<KindSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByText("What's your goal?")).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2KindSelect-alert')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2KindSelect-signal')).toBeInTheDocument();
    expect(screen.getByText('Detect and respond')).toBeInTheDocument();
    expect(screen.getByText('Collect evidence')).toBeInTheDocument();
  });

  it('calls onChange with the selected kind', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    render(<KindSelect value="alert" onChange={onChange} />);

    await user.click(screen.getByTestId('ruleV2KindSelect-signal'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('honors a custom data-test-subj', () => {
    render(<KindSelect value="signal" onChange={jest.fn()} data-test-subj="customKind" />);

    expect(screen.getByTestId('customKind')).toBeInTheDocument();
    expect(screen.getByTestId('customKind-signal')).toBeInTheDocument();
  });

  it('disables the cards when disabled', () => {
    render(<KindSelect value="alert" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('ruleV2KindSelect-alert').querySelector('input')).toBeDisabled();
    expect(screen.getByTestId('ruleV2KindSelect-signal').querySelector('input')).toBeDisabled();
  });

  it('renders only the selected card when readOnly', () => {
    render(<KindSelect value="alert" onChange={jest.fn()} readOnly />);

    expect(screen.getByTestId('ruleV2KindSelect-alert')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleV2KindSelect-signal')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2KindSelect-alert').querySelector('input')).toBeDisabled();
  });

  it('associates the goal label with the option group via a fieldset/legend', () => {
    render(<KindSelect value="alert" onChange={jest.fn()} />);

    expect(screen.getByRole('group', { name: "What's your goal?" })).toBeInTheDocument();
  });
});
