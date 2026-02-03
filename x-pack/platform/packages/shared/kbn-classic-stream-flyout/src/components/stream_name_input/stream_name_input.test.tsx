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
    parts: [''],
    onPartsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no wildcards', () => {
    it('renders a read-only field for pattern with no wildcards', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="logs-apache.access" />
      );
      const input = getByTestId('streamNameInput-readonly');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveValue('logs-apache.access');
    });
  });

  describe('single wildcard patterns', () => {
    it('renders a single input for pattern with one wildcard', () => {
      const { getByTestId } = render(<StreamNameInput {...defaultProps} />);

      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
    });

    it('displays static prefix as prepend text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="logs-apache-*" parts={['']} />
      );

      expect(getByText('logs-apache-')).toBeInTheDocument();
    });

    it('displays static suffix as append text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-default" parts={['']} />
      );

      expect(getByText('-logs-default')).toBeInTheDocument();
    });

    it('calls onPartsChange when input changes', () => {
      const onPartsChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="logs-*"
          parts={['']}
          onPartsChange={onPartsChange}
        />
      );

      const input = getByTestId('streamNameInput-wildcard-0');
      fireEvent.change(input, { target: { value: 'mystream' } });

      expect(onPartsChange).toHaveBeenCalledWith(['mystream']);
    });

    it('does not call initial onChange on mount', () => {
      const onPartsChange = jest.fn();
      render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="logs-*"
          parts={['']}
          onPartsChange={onPartsChange}
        />
      );

      // Should not be called on mount - parent manages initial state
      expect(onPartsChange).not.toHaveBeenCalled();
    });
  });

  describe('multiple wildcard patterns', () => {
    it('renders multiple inputs for patterns with multiple wildcards', () => {
      const { getByTestId } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" parts={['', '', '']} />
      );

      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();
    });

    it('renders static segments between wildcards as prepend text', () => {
      const { getByText } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-data-*" parts={['', '', '']} />
      );

      expect(getByText('-logs-')).toBeInTheDocument();
      expect(getByText('-data-')).toBeInTheDocument();
    });

    it('allows editing each wildcard independently', () => {
      const onPartsChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*-*"
          parts={['', '', '']}
          onPartsChange={onPartsChange}
        />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');
      const input2 = getByTestId('streamNameInput-wildcard-2');

      fireEvent.change(input0, { target: { value: 'foo' } });
      expect(onPartsChange).toHaveBeenLastCalledWith(['foo', '', '']);

      fireEvent.change(input1, { target: { value: 'bar' } });
      expect(onPartsChange).toHaveBeenLastCalledWith(['', 'bar', '']);

      fireEvent.change(input2, { target: { value: 'baz' } });
      expect(onPartsChange).toHaveBeenLastCalledWith(['', '', 'baz']);
    });

    it('calls onPartsChange when only some wildcards are filled', () => {
      const onPartsChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*-*"
          parts={['', '', '']}
          onPartsChange={onPartsChange}
        />
      );

      // Fill only the second wildcard
      const input1 = getByTestId('streamNameInput-wildcard-1');
      fireEvent.change(input1, { target: { value: 'foo' } });

      expect(onPartsChange).toHaveBeenLastCalledWith(['', 'foo', '']);
    });

    it('calls onPartsChange when all wildcards are filled', () => {
      const onPartsChange = jest.fn();
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*-*"
          parts={['', '', '']}
          onPartsChange={onPartsChange}
        />
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

      expect(onPartsChange).toHaveBeenLastCalledWith(['', '', 'baz']);
    });

    it('supports patterns with many wildcards (5+)', () => {
      const { getByTestId, getByText } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-really-*-long-*-index-*-name-*"
          parts={['', '', '', '', '']}
        />
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
    it('accepts new parts when pattern changes', () => {
      const { getByTestId, rerender } = render(
        <StreamNameInput {...defaultProps} indexPattern="logs-*" parts={['mystream']} />
      );

      // Fill in the input
      const input = getByTestId('streamNameInput-wildcard-0');
      expect(input).toHaveValue('mystream');

      // Change the pattern with new empty parts (parent manages reset)
      rerender(<StreamNameInput {...defaultProps} indexPattern="metrics-*" parts={['']} />);

      // Input should show new empty value
      const newInput = getByTestId('streamNameInput-wildcard-0');
      expect(newInput).toHaveValue('');
    });

    it('renders correct number of inputs when pattern wildcard count changes', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <StreamNameInput {...defaultProps} indexPattern="*-logs-*-*" parts={['', '', '']} />
      );

      // Initially 3 wildcards
      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
      expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();

      // Change to single wildcard pattern (parent provides new parts array)
      rerender(<StreamNameInput {...defaultProps} indexPattern="logs-*" parts={['']} />);

      // Should now have only 1 wildcard
      expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
      expect(queryByTestId('streamNameInput-wildcard-1')).not.toBeInTheDocument();
      expect(queryByTestId('streamNameInput-wildcard-2')).not.toBeInTheDocument();
    });
  });

  describe('validation state', () => {
    it('does not show invalid state when validationError is null', () => {
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*"
          parts={['', '']}
          validationError={null}
        />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).not.toHaveAttribute('aria-invalid', 'true');
      expect(input1).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('shows invalid state on all inputs when validationError is duplicate', () => {
      const { getByTestId } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*"
          parts={['', '']}
          validationError="duplicate"
        />
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
          parts={['', '']}
          validationError="higherPriority"
        />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows invalid state only on empty inputs when validationError is empty', () => {
      const onPartsChange = jest.fn();
      const { getByTestId, rerender } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*"
          parts={['', '']}
          validationError="empty"
          onPartsChange={onPartsChange}
        />
      );

      // Initially all inputs are empty, so all should be invalid
      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');

      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');

      // Fill in the first input - parent updates parts
      fireEvent.change(input0, { target: { value: 'filled' } });
      rerender(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*"
          parts={['filled', '']}
          validationError="empty"
          onPartsChange={onPartsChange}
        />
      );

      // Now only the second input should be invalid
      expect(input0).not.toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears invalid state on input when filled (empty validation error)', () => {
      const onPartsChange = jest.fn();
      const { getByTestId, rerender } = render(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*-data-*"
          parts={['', '', '']}
          validationError="empty"
          onPartsChange={onPartsChange}
        />
      );

      const input0 = getByTestId('streamNameInput-wildcard-0');
      const input1 = getByTestId('streamNameInput-wildcard-1');
      const input2 = getByTestId('streamNameInput-wildcard-2');

      // All empty initially
      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).toHaveAttribute('aria-invalid', 'true');
      expect(input2).toHaveAttribute('aria-invalid', 'true');

      // Fill in the middle input - parent updates parts
      fireEvent.change(input1, { target: { value: 'filled' } });
      rerender(
        <StreamNameInput
          {...defaultProps}
          indexPattern="*-logs-*-data-*"
          parts={['', 'filled', '']}
          validationError="empty"
          onPartsChange={onPartsChange}
        />
      );

      // Only first and third should be invalid now
      expect(input0).toHaveAttribute('aria-invalid', 'true');
      expect(input1).not.toHaveAttribute('aria-invalid', 'true');
      expect(input2).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
