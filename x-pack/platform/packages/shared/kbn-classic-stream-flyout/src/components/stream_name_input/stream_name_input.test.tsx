/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { StreamNameInput } from './stream_name_input';

describe('StreamNameInput', () => {
  const defaultProps = {
    indexPattern: 'logs-*',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('single wildcard patterns', () => {
    it('renders a single input for pattern with one wildcard', () => {
      const { getByTestId } = render(<StreamNameInput {...defaultProps} />);

      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
    });

    it('displays static prefix as prepend text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="logs-apache-*" />
      );

      expect(getByText('logs-apache-')).toBeInTheDocument();
    });

    it('displays static suffix as append text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-default" />
      );

      expect(getByText('-logs-default')).toBeInTheDocument();
    });

    it('calls onChange with stream name when input changes', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="logs-*" onChange={onChange} />
      );

      const input = getByTestId('streamNameInput-wildcard-0');
      fireEvent.change(input, { target: { value: 'mystream' } });

      expect(onChange).toHaveBeenCalledWith('logs-mystream');
    });

    it('keeps wildcard (*) in stream name when input is empty', () => {
      const onChange = jest.fn();
      render(<StreamNameInput {...defaultProps} indexPattern="logs-*" onChange={onChange} />);

      // Initial call with empty input should keep the wildcard
      expect(onChange).toHaveBeenCalledWith('logs-*');
    });
  });

  describe('multiple wildcard patterns', () => {
    it('renders multiple inputs for patterns with multiple wildcards', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" />
      );

      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();
    });

    it('renders static segments between wildcards as prepend text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-data-*" />
      );

      expect(getByText('-logs-')).toBeInTheDocument();
      expect(getByText('-data-')).toBeInTheDocument();
    });

    it('allows editing each wildcard independently', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');
      const input2 = getByTestId('streamNameInput-wildcard-2');

      fireEvent.change(input0, { target: { value: 'foo' } });
      fireEvent.change(input1, { target: { value: 'bar' } });
      fireEvent.change(input2, { target: { value: 'baz' } });

      expect(input0).toHaveValue('foo');
      expect(input1).toHaveValue('bar');
      expect(input2).toHaveValue('baz');
    });

    it('correctly builds stream name when only some wildcards are filled', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" onChange={onChange} />
      );

      // Fill only the second wildcard
      const input1 = getByTestId('streamNameInput-wildcard-1');
      fireEvent.change(input1, { target: { value: 'foo' } });

      // Should keep unfilled wildcards as *
      expect(onChange).toHaveBeenLastCalledWith('*-logs-foo-*');
    });

    it('correctly builds stream name when all wildcards are filled', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" onChange={onChange} />
      );

      fireEvent.change(getByTestId('streamNameInput-wildcard-0'), {
        target: { value: 'foo' },
      });
      fireEvent.change(getByTestId('streamNameInput-wildcard-1'), {
        target: { value: 'bar' },
      });
      fireEvent.change(getByTestId('streamNameInput-wildcard-2'), {
        target: { value: 'baz' },
      });

      expect(onChange).toHaveBeenLastCalledWith('foo-logs-bar-baz');
    });

    it('supports patterns with many wildcards (5+)', () => {
      const { getByTestId, getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-really-*-long-*-index-*-name-*" />
      );

      // All 5 wildcard inputs should exist
      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-3')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-4')).toBeInTheDocument();

      // Static segments should be visible
      expect(getByText('-really-')).toBeInTheDocument();
      expect(getByText('-long-')).toBeInTheDocument();
      expect(getByText('-index-')).toBeInTheDocument();
      expect(getByText('-name-')).toBeInTheDocument();
    });
  });

  describe('pattern changes', () => {
    it('resets input values when pattern changes (via key prop)', () => {
      const onChange = jest.fn();
      const { getByTestId, rerender } = render(
        <StreamNameInput {...defaultProps} key="logs-*" indexPattern="logs-*" onChange={onChange} />
      );

      // Fill in the input
      const input = getByTestId('streamNameInput-wildcard-0');
      fireEvent.change(input, { target: { value: 'mystream' } });
      expect(input).toHaveValue('mystream');

      // Change the pattern with a new key to force remount
      rerender(
        <StreamNameInput
          {...defaultProps}
          key="metrics-*"
          indexPattern="metrics-*"
          onChange={onChange}
        />
      );

      // Input should be reset
      const newInput = getByTestId('streamNameInput-wildcard-0');
      expect(newInput).toHaveValue('');
    });

    it('updates number of inputs when pattern wildcard count changes (via key prop)', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <StreamNameInput {...defaultProps} key="*-logs-*-*" indexPattern="*-logs-*-*" />
      );

      // Initially 3 wildcards
      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();

      // Change to single wildcard pattern with new key
      rerender(<StreamNameInput {...defaultProps} key="logs-*" indexPattern="logs-*" />);

      // Should now have only 1 wildcard
      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(queryByTestId('streamNameInput-wildcard-1')).not.toBeInTheDocument();
      expect(queryByTestId('streamNameInput-wildcard-2')).not.toBeInTheDocument();
    });
  });

  describe('validation state', () => {
    it('does not show invalid state when validationError is null', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*" validationError={null} />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).not.toHaveAttribute('aria-invalid', 'true');
      expect(input1).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('shows invalid state on all inputs when validationError is duplicate', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*" validationError="duplicate" />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows invalid state on all inputs when validationError is higherPriority', () => {
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*"
          validationError="higherPriority"
        />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows invalid state only on empty inputs when validationError is empty', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*" validationError="empty" />
      );

      // Initially all inputs are empty, so all should be invalid
      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');

      // Fill in the first input
      fireEvent.change(input0, { target: { value: 'filled' } });

      // Now only the second input should be invalid
      expect(input0).not.toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears invalid state on input when filled (empty validation error)', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-data-*" validationError="empty" />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');
      const input2 = getByTestId('streamNameInput-wildcard-2');

      // All empty initially
      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
      expect(input2).toHaveAttribute('aria-invalid', 'true');

      // Fill in the middle input
      fireEvent.change(input1, { target: { value: 'filled' } });

      // Only first and third should be invalid now
      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).not.toHaveAttribute('aria-invalid', 'true');
      expect(input2).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
