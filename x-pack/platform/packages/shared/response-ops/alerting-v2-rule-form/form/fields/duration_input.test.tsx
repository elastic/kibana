/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DurationInput, type DurationInputProps } from './duration_input';

const defaultProps: DurationInputProps = {
  value: '5m',
  onChange: jest.fn(),
  numberLabel: 'Every',
  unitAriaLabel: 'Unit',
  dataTestSubj: 'testDuration',
  idPrefix: 'testDuration',
};

const renderDurationInput = (overrides: Partial<DurationInputProps> = {}) => {
  const props = { ...defaultProps, ...overrides, onChange: jest.fn() };
  const result = render(<DurationInput {...props} />);
  return { ...result, onChange: props.onChange };
};

describe('DurationInput', () => {
  afterEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders the number input with the parsed value', () => {
      renderDurationInput({ value: '10h' });
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('renders the number label as a prepend', () => {
      renderDurationInput({ numberLabel: 'Last' });
      expect(screen.getByText('Last')).toBeInTheDocument();
    });

    it('renders the unit select with the parsed unit', () => {
      renderDurationInput({ value: '3h' });
      // The select should show the "hours" option as selected
      const select = screen.getByTestId('testDurationUnitInput');
      expect(select).toHaveValue('h');
    });

    it('uses the fallback when value is empty', () => {
      renderDurationInput({ value: '', fallback: '10d' });
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      const select = screen.getByTestId('testDurationUnitInput');
      expect(select).toHaveValue('d');
    });

    it('uses "1m" when both value and fallback are empty', () => {
      renderDurationInput({ value: '', fallback: undefined });
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      const select = screen.getByTestId('testDurationUnitInput');
      expect(select).toHaveValue('m');
    });

    it('applies data-test-subj attributes', () => {
      renderDurationInput({ dataTestSubj: 'myDuration', idPrefix: 'myDuration' });
      expect(screen.getByTestId('myDuration')).toBeInTheDocument();
      expect(screen.getByTestId('myDurationNumberInput')).toBeInTheDocument();
      expect(screen.getByTestId('myDurationUnitInput')).toBeInTheDocument();
    });

    it('shows error state when errors are provided', () => {
      renderDurationInput({ errors: 'Value is required' });
      expect(screen.getByText('Value is required')).toBeInTheDocument();
    });
  });

  describe('number input changes', () => {
    it('calls onChange with a valid positive integer', () => {
      const { onChange } = renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      fireEvent.change(input, { target: { value: '10' } });

      expect(onChange).toHaveBeenCalledWith('10m');
    });

    it('does not call onChange for an empty value but updates the display', () => {
      const { onChange } = renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      fireEvent.change(input, { target: { value: '' } });

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue(null); // EuiFieldNumber shows null for empty
    });

    it('does not call onChange for zero', () => {
      const { onChange } = renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      fireEvent.change(input, { target: { value: '0' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('allows clearing and retyping a new value', () => {
      const { onChange } = renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      // Clear the field
      fireEvent.change(input, { target: { value: '' } });
      expect(onChange).not.toHaveBeenCalled();

      // Type a new value
      fireEvent.change(input, { target: { value: '1' } });
      expect(onChange).toHaveBeenCalledWith('1m');
    });
  });

  describe('blur behaviour', () => {
    it('restores the last valid value on blur when the field is empty', () => {
      renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      // Clear the field
      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);

      // Blur should restore
      fireEvent.blur(input);
      expect(input).toHaveValue(5);
    });

    it('does not change the value on blur when the field has a valid value', () => {
      renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      fireEvent.change(input, { target: { value: '12' } });
      fireEvent.blur(input);

      expect(input).toHaveValue(12);
    });
  });

  describe('unit select changes', () => {
    it('calls onChange with the new unit and existing number', () => {
      const { onChange } = renderDurationInput({ value: '5m' });
      const select = screen.getByTestId('testDurationUnitInput');

      fireEvent.change(select, { target: { value: 'h' } });

      expect(onChange).toHaveBeenCalledWith('5h');
    });
  });

  describe('key filtering', () => {
    it.each(['-', '+', '.', 'e', 'E'])('prevents typing "%s"', (key) => {
      renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('allows typing normal number keys', async () => {
      renderDurationInput({ value: '5m' });
      const input = screen.getByTestId('testDurationNumberInput');

      const event = new KeyboardEvent('keydown', { key: '3', bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
