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
    // Use a more specific selector to avoid selecting the checkbox input
    const fromInput = screen
      .getByTestId('streamsAppRangeInput-from')
      .querySelector('input[role="combobox"]') as HTMLInputElement;
    const toInput = screen
      .getByTestId('streamsAppRangeInput-to')
      .querySelector('input[role="combobox"]') as HTMLInputElement;

    expect(fromInput.value).toBe('2024-01-01');
    expect(toInput.value).toBe('2024-12-31');
  });

  it('calls onChange when from value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = {};
    render(<RangeInput value={value} onChange={onChange} />);

    const fromInput = screen
      .getByTestId('streamsAppRangeInput-from')
      .querySelector('input[role="combobox"]')!;
    await user.type(fromInput, '2024-01-01');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '2024-01-01' });
  });

  it('calls onChange when to value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = { gte: '2024-01-01' };
    render(<RangeInput value={value} onChange={onChange} />);

    const toInput = screen
      .getByTestId('streamsAppRangeInput-to')
      .querySelector('input[role="combobox"]')!;
    await user.type(toInput, '2024-12-31');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '2024-01-01', lte: '2024-12-31' });
  });

  it('removes field when cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const value: RangeCondition = { gte: '10', lt: '100' };
    render(<RangeInput value={value} onChange={onChange} />);

    const fromContainer = screen.getByTestId('streamsAppRangeInput-from');

    // Use EUI's clear button to clear the field
    const clearButton = fromContainer.querySelector(
      '[data-test-subj="comboBoxClearButton"]'
    ) as HTMLButtonElement;
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({ lt: '100' });
  });

  it('allows both from and to values to be set', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(<RangeInput value={{}} onChange={onChange} />);

    // Set "from" value
    const fromInput = screen
      .getByTestId('streamsAppRangeInput-from')
      .querySelector('input[role="combobox"]')!;
    await user.type(fromInput, '18');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ gte: '18' });

    // Re-render with updated value to simulate state management
    rerender(<RangeInput value={{ gte: '18' }} onChange={onChange} />);

    // Set "to" value
    const toInput = screen
      .getByTestId('streamsAppRangeInput-to')
      .querySelector('input[role="combobox"]')!;
    await user.type(toInput, '65');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith({ gte: '18', lte: '65' });
  });

  it('respects disabled prop', () => {
    const onChange = jest.fn();
    const value: RangeCondition = {};
    render(<RangeInput value={value} onChange={onChange} disabled />);

    // AutocompleteSelector uses EuiComboBox, which renders the disabled state on the input inside
    const fromInput = screen
      .getByTestId('streamsAppRangeInput-from')
      .querySelector('input[role="combobox"]');
    const toInput = screen
      .getByTestId('streamsAppRangeInput-to')
      .querySelector('input[role="combobox"]');

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

  describe('checkbox functionality', () => {
    it('renders checkboxes for from and to fields', () => {
      const onChange = jest.fn();
      const value: RangeCondition = {};
      render(<RangeInput value={value} onChange={onChange} />);

      expect(screen.getByTestId('streamsAppRangeInput-from-inclusive')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppRangeInput-to-inclusive')).toBeInTheDocument();
    });

    it('defaults from checkbox to checked (gte) and to checkbox to checked (lte)', () => {
      const onChange = jest.fn();
      const value: RangeCondition = { gte: '10', lte: '100' };
      render(<RangeInput value={value} onChange={onChange} />);

      const fromCheckbox = screen.getByTestId(
        'streamsAppRangeInput-from-inclusive'
      ) as HTMLInputElement;
      const toCheckbox = screen.getByTestId(
        'streamsAppRangeInput-to-inclusive'
      ) as HTMLInputElement;

      expect(fromCheckbox.checked).toBe(true);
      expect(toCheckbox.checked).toBe(true);
    });

    it('shows correct checkbox states for gt/lte operators', () => {
      const onChange = jest.fn();
      const value: RangeCondition = { gt: '10', lte: '100' };
      render(<RangeInput value={value} onChange={onChange} />);

      const fromCheckbox = screen.getByTestId(
        'streamsAppRangeInput-from-inclusive'
      ) as HTMLInputElement;
      const toCheckbox = screen.getByTestId(
        'streamsAppRangeInput-to-inclusive'
      ) as HTMLInputElement;

      expect(fromCheckbox.checked).toBe(false);
      expect(toCheckbox.checked).toBe(true);
    });

    it('toggles from operator between gte and gt when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const value: RangeCondition = { gte: '10', lt: '100' };
      render(<RangeInput value={value} onChange={onChange} />);

      const fromCheckbox = screen.getByTestId('streamsAppRangeInput-from-inclusive');

      // Uncheck to change from gte to gt
      await user.click(fromCheckbox);

      expect(onChange).toHaveBeenCalledWith({ gt: '10', lt: '100' });
    });

    it('toggles to operator between lte and lt when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const value: RangeCondition = { gte: '10', lte: '100' };
      render(<RangeInput value={value} onChange={onChange} />);

      const toCheckbox = screen.getByTestId('streamsAppRangeInput-to-inclusive');

      // Uncheck to change from lte to lt
      await user.click(toCheckbox);

      expect(onChange).toHaveBeenCalledWith({ gte: '10', lt: '100' });
    });

    it('allows checkbox to be toggled even with empty value', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const value: RangeCondition = {};
      render(<RangeInput value={value} onChange={onChange} />);

      const fromCheckbox = screen.getByTestId('streamsAppRangeInput-from-inclusive');

      // Default is checked (gte), clicking unchecks it (changes to gt)
      await user.click(fromCheckbox);

      // Should change from gte to gt with empty string
      expect(onChange).toHaveBeenCalledWith({ gt: '' });
    });

    it('uses checkbox state when entering new values', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      // Start with gt (unchecked state)
      render(<RangeInput value={{ gt: '' }} onChange={onChange} />);

      // Verify checkbox is unchecked for gt
      const fromCheckbox = screen.getByTestId(
        'streamsAppRangeInput-from-inclusive'
      ) as HTMLInputElement;
      expect(fromCheckbox.checked).toBe(false);

      // Enter a value - should use gt
      const fromInput = screen
        .getByTestId('streamsAppRangeInput-from')
        .querySelector('input[role="combobox"]')!;
      await user.type(fromInput, '50');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith({ gt: '50' });
    });

    it('preserves checkbox state when value changes', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const { rerender } = render(
        <RangeInput value={{ gte: '10', lt: '100' }} onChange={onChange} />
      );

      // Toggle from checkbox to gt
      const fromCheckbox = screen.getByTestId('streamsAppRangeInput-from-inclusive');
      await user.click(fromCheckbox);

      expect(onChange).toHaveBeenCalledWith({ gt: '10', lt: '100' });

      // Re-render with new value
      rerender(<RangeInput value={{ gt: '10', lt: '100' }} onChange={onChange} />);

      // Verify checkbox reflects new state
      const updatedFromCheckbox = screen.getByTestId(
        'streamsAppRangeInput-from-inclusive'
      ) as HTMLInputElement;
      expect(updatedFromCheckbox.checked).toBe(false);
    });

    it('checkboxes are not disabled when fields are empty', () => {
      const onChange = jest.fn();
      const value: RangeCondition = {};
      render(<RangeInput value={value} onChange={onChange} />);

      const fromCheckbox = screen.getByTestId('streamsAppRangeInput-from-inclusive');
      const toCheckbox = screen.getByTestId('streamsAppRangeInput-to-inclusive');

      expect(fromCheckbox).not.toBeDisabled();
      expect(toCheckbox).not.toBeDisabled();
    });

    it('respects disabled prop for checkboxes', () => {
      const onChange = jest.fn();
      const value: RangeCondition = { gte: '10', lt: '100' };
      render(<RangeInput value={value} onChange={onChange} disabled />);

      const fromCheckbox = screen.getByTestId('streamsAppRangeInput-from-inclusive');
      const toCheckbox = screen.getByTestId('streamsAppRangeInput-to-inclusive');

      expect(fromCheckbox).toBeDisabled();
      expect(toCheckbox).toBeDisabled();
    });
  });
});
