/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RangeCondition } from '@kbn/streamlang';

import { RangeInput } from './range_input';

describe('RangeInput', () => {
  it('renders from and to input fields', () => {
    const onChange = jest.fn();
    const value: RangeCondition = {};
    render(<RangeInput value={value} onChange={onChange} />);

    expect(screen.getByTestId('streamsAppRangeInput-from')).toBeInTheDocument();
    expect(screen.getByTestId('streamsAppRangeInput-to')).toBeInTheDocument();
  });

  it('displays existing values', () => {
    const onChange = jest.fn();
    const value: RangeCondition = { gte: '2024-01-01', lt: '2024-12-31' };
    render(<RangeInput value={value} onChange={onChange} />);

    // AutocompleteSelector uses EuiComboBox, query the actual input element inside
    const fromInput = screen
      .getByTestId('streamsAppRangeInput-from')
      .querySelector('input') as HTMLInputElement;
    const toInput = screen
      .getByTestId('streamsAppRangeInput-to')
      .querySelector('input') as HTMLInputElement;

    expect(fromInput.value).toBe('2024-01-01');
    expect(toInput.value).toBe('2024-12-31');
  });

  it('calls onChange when from value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = {};
    render(<RangeInput value={value} onChange={onChange} />);

    const fromInput = screen.getByTestId('streamsAppRangeInput-from').querySelector('input')!;
    await user.type(fromInput, '2024-01-01');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '2024-01-01' });
  });

  it('calls onChange when to value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = { gte: '2024-01-01' };
    render(<RangeInput value={value} onChange={onChange} />);

    const toInput = screen.getByTestId('streamsAppRangeInput-to').querySelector('input')!;
    await user.type(toInput, '2024-12-31');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '2024-01-01', lt: '2024-12-31' });
  });

  it('removes field when cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = { gte: '10', lt: '100' };
    render(<RangeInput value={value} onChange={onChange} />);

    const fromInput = screen.getByTestId('streamsAppRangeInput-from').querySelector('input')!;

    // Select all text and delete it to clear the field
    await user.click(fromInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ lt: '100' });
  });

  it('allows both from and to values to be set', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(<RangeInput value={{}} onChange={onChange} />);

    // Set "from" value
    const fromInput = screen.getByTestId('streamsAppRangeInput-from').querySelector('input')!;
    await user.type(fromInput, '18');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '18' });

    // Re-render with updated value to simulate state management
    rerender(<RangeInput value={{ gte: '18' }} onChange={onChange} />);

    // Set "to" value
    const toInput = screen.getByTestId('streamsAppRangeInput-to').querySelector('input')!;
    await user.type(toInput, '65');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith({ gte: '18', lt: '65' });
  });

  it('respects disabled prop', () => {
    const onChange = jest.fn();
    const value: RangeCondition = {};
    render(<RangeInput value={value} onChange={onChange} disabled />);

    // AutocompleteSelector uses EuiComboBox, which renders the disabled state on the input inside
    const fromInput = screen.getByTestId('streamsAppRangeInput-from').querySelector('input');
    const toInput = screen.getByTestId('streamsAppRangeInput-to').querySelector('input');

    expect(fromInput).toBeDisabled();
    expect(toInput).toBeDisabled();
  });

  it('passes valueSuggestions to autocomplete selectors', () => {
    const onChange = jest.fn();
    const value: RangeCondition = {};
    const suggestions = [
      { name: '2024-01-01', type: 'date' },
      { name: '2024-06-01', type: 'date' },
      { name: '2024-12-31', type: 'date' },
    ];
    render(<RangeInput value={value} onChange={onChange} valueSuggestions={suggestions} />);

    expect(screen.getByTestId('streamsAppRangeInput-from')).toBeInTheDocument();
    expect(screen.getByTestId('streamsAppRangeInput-to')).toBeInTheDocument();
  });
});
