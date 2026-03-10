/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StateTransitionCountInput,
  type StateTransitionCountInputProps,
} from './state_transition_count_input';

const defaultProps: StateTransitionCountInputProps = {
  value: 5,
  onChange: jest.fn(),
  onKeyDown: jest.fn(),
  inputRef: jest.fn(),
};

const renderInput = (overrides: Partial<StateTransitionCountInputProps> = {}) => {
  const props = { ...defaultProps, ...overrides, onChange: jest.fn() };
  const result = render(<StateTransitionCountInput {...props} />);
  return { ...result, onChange: props.onChange };
};

describe('StateTransitionCountInput', () => {
  afterEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders the input with the provided value', () => {
      renderInput({ value: 7 });
      expect(screen.getByTestId('stateTransitionCountInput')).toHaveValue(7);
    });

    it('falls back to default count (2) when value is undefined', () => {
      renderInput({ value: undefined });
      expect(screen.getByTestId('stateTransitionCountInput')).toHaveValue(2);
    });

    it('renders with a prepend label when provided', () => {
      renderInput({ prependLabel: 'Count' });
      expect(screen.getByText('Count')).toBeInTheDocument();
    });

    it('shows error state when error is provided', () => {
      renderInput({ error: { message: 'Required' } });
      const input = screen.getByTestId('stateTransitionCountInput');
      expect(input).toBeInvalid();
    });
  });

  describe('number input changes', () => {
    it('calls onChange with a valid positive integer', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '10' } });

      expect(onChange).toHaveBeenCalledWith(10);
    });

    it('does not call onChange for an empty value but updates the display', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '' } });

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue(null);
    });

    it('does not call onChange for zero', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '0' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('allows clearing and retyping a new value', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '' } });
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: '3' } });
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('does not call onChange when value exceeds MAX_CONSECUTIVE_BREACHES', () => {
      const { onChange } = renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '1001' } });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('blur behaviour', () => {
    it('restores the last valid value on blur when the field is empty', () => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);

      fireEvent.blur(input);
      expect(input).toHaveValue(5);
    });

    it('does not change the value on blur when the field has a valid value', () => {
      renderInput({ value: 5 });
      const input = screen.getByTestId('stateTransitionCountInput');

      fireEvent.change(input, { target: { value: '12' } });
      fireEvent.blur(input);

      expect(input).toHaveValue(12);
    });
  });
});
