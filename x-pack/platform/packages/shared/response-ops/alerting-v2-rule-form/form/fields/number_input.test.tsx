/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberInput, type NumberInputProps } from './number_input';

const defaultProps: NumberInputProps = {
  value: 5,
  onChange: jest.fn(),
  'data-test-subj': 'testNumberInput',
};

const renderInput = (overrides: Partial<NumberInputProps> = {}) => {
  const props = { ...defaultProps, ...overrides, onChange: jest.fn() };
  const result = render(<NumberInput {...props} />);
  return { ...result, onChange: props.onChange };
};

describe('NumberInput', () => {
  afterEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders the input with the provided value', () => {
      renderInput({ value: 7 });
      expect(screen.getByTestId('testNumberInput')).toHaveValue(7);
    });

    it('renders with a prepend label when provided', () => {
      renderInput({ prepend: ['Count'] });
      expect(screen.getByText('Count')).toBeInTheDocument();
    });

    it('shows invalid state when isInvalid is true', () => {
      renderInput({ isInvalid: true });
      expect(screen.getByTestId('testNumberInput')).toBeInvalid();
    });
  });

  describe('number input changes', () => {
    it('calls onChange with a valid positive integer', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '10' } });

      expect(onChange).toHaveBeenCalledWith(10);
    });

    it('does not call onChange for an empty value but updates the display', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '' } });

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue(null);
    });

    it('does not call onChange for zero', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '0' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('allows clearing and retyping a new value', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '' } });
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: '3' } });
      expect(onChange).toHaveBeenCalledWith(3);
    });
  });

  describe('validate prop', () => {
    it('does not call onChange when validate returns false', () => {
      const { onChange } = renderInput({
        value: 5,
        validate: (val) => val <= 100,
      });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '101' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls onChange when validate returns true', () => {
      const { onChange } = renderInput({
        value: 5,
        validate: (val) => val <= 100,
      });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '50' } });

      expect(onChange).toHaveBeenCalledWith(50);
    });
  });

  describe('blur behaviour', () => {
    it('restores the last valid value on blur when the field is empty', () => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);

      fireEvent.blur(input);
      expect(input).toHaveValue(5);
    });

    it('does not change the value on blur when the field has a valid value', () => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      fireEvent.change(input, { target: { value: '12' } });
      fireEvent.blur(input);

      expect(input).toHaveValue(12);
    });
  });

  describe('key filtering', () => {
    it.each(['-', '+', ',', '.', 'e', 'E'])('prevents typing "%s"', (key) => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('allows typing normal number keys', () => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('testNumberInput');

      const event = new KeyboardEvent('keydown', { key: '3', bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
