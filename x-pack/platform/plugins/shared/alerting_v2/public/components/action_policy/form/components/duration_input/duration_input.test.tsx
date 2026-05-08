/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DurationInput } from './duration_input';

describe('DurationInput', () => {
  it('renders with parsed value and unit from string prop', () => {
    render(<DurationInput value="5m" onChange={jest.fn()} />);

    const numberInput = screen.getByTestId('durationValueInput');
    const unitSelect = screen.getByTestId('durationUnitSelect');

    expect(numberInput).toHaveValue(5);
    expect(unitSelect).toHaveValue('m');
  });

  it('renders empty number with default unit when value is empty', () => {
    render(<DurationInput value="" onChange={jest.fn()} />);

    const numberInput = screen.getByTestId('durationValueInput');
    const unitSelect = screen.getByTestId('durationUnitSelect');

    expect(numberInput).toHaveValue(null);
    expect(unitSelect).toHaveValue('m');
  });

  it('calls onChange with combined string when number changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DurationInput value="5m" onChange={onChange} />);

    const numberInput = screen.getByTestId('durationValueInput');
    await user.clear(numberInput);
    await user.type(numberInput, '10');

    expect(onChange).toHaveBeenCalledWith('10m');
  });

  it('calls onChange with combined string when unit changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DurationInput value="5m" onChange={onChange} />);

    await user.selectOptions(screen.getByTestId('durationUnitSelect'), 'h');

    expect(onChange).toHaveBeenCalledWith('5h');
  });

  it('calls onChange with empty string when number is cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DurationInput value="5m" onChange={onChange} />);

    const numberInput = screen.getByTestId('durationValueInput');
    await user.clear(numberInput);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('passes isInvalid to EuiFieldNumber', () => {
    render(<DurationInput value="" onChange={jest.fn()} isInvalid />);

    const numberInput = screen.getByTestId('durationValueInput');
    expect(numberInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('parses 1d correctly', () => {
    render(<DurationInput value="1d" onChange={jest.fn()} />);

    expect(screen.getByTestId('durationValueInput')).toHaveValue(1);
    expect(screen.getByTestId('durationUnitSelect')).toHaveValue('d');
  });

  it('parses 30s correctly', () => {
    render(<DurationInput value="30s" onChange={jest.fn()} />);

    expect(screen.getByTestId('durationValueInput')).toHaveValue(30);
    expect(screen.getByTestId('durationUnitSelect')).toHaveValue('s');
  });

  it('syncs internal state when value prop changes externally', () => {
    const { rerender } = render(<DurationInput value="5m" onChange={jest.fn()} />);

    expect(screen.getByTestId('durationValueInput')).toHaveValue(5);
    expect(screen.getByTestId('durationUnitSelect')).toHaveValue('m');

    rerender(<DurationInput value="" onChange={jest.fn()} />);

    expect(screen.getByTestId('durationValueInput')).toHaveValue(null);
    expect(screen.getByTestId('durationUnitSelect')).toHaveValue('m');
  });

  it('syncs when value prop changes to a different duration', () => {
    const { rerender } = render(<DurationInput value="5m" onChange={jest.fn()} />);

    rerender(<DurationInput value="10h" onChange={jest.fn()} />);

    expect(screen.getByTestId('durationValueInput')).toHaveValue(10);
    expect(screen.getByTestId('durationUnitSelect')).toHaveValue('h');
  });
});
