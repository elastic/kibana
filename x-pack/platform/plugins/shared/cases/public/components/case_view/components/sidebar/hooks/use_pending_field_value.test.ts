/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { usePendingFieldValue } from './use_pending_field_value';

describe('usePendingFieldValue', () => {
  it('starts with no pending change, showing the committed value', () => {
    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit: jest.fn() })
    );

    expect(result.current.currentValue).toBe('a');
    expect(result.current.hasPendingChange).toBe(false);
  });

  it('tracks a pending change without calling onSubmit', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit })
    );

    act(() => result.current.setPendingValue('b'));

    expect(result.current.currentValue).toBe('b');
    expect(result.current.hasPendingChange).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no pending change when the pending value equals the committed value', () => {
    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit: jest.fn() })
    );

    act(() => result.current.setPendingValue('a'));

    expect(result.current.hasPendingChange).toBe(false);
  });

  it('calls onSubmit and clears the pending change on confirm', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit })
    );

    act(() => result.current.setPendingValue('b'));
    act(() => result.current.onConfirm());

    expect(onSubmit).toHaveBeenCalledWith('b');
    expect(result.current.hasPendingChange).toBe(false);
    expect(result.current.currentValue).toBe('a');
  });

  it('reverts to the committed value without calling onSubmit on cancel', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit })
    );

    act(() => result.current.setPendingValue('b'));
    act(() => result.current.onCancel());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.currentValue).toBe('a');
    expect(result.current.hasPendingChange).toBe(false);
  });

  it('supports a committed/pending value of null without confusing it for "no pending change"', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      usePendingFieldValue<string | null>({ committedValue: 'a', onSubmit })
    );

    act(() => result.current.setPendingValue(null));

    expect(result.current.hasPendingChange).toBe(true);
    expect(result.current.currentValue).toBeNull();

    act(() => result.current.onConfirm());

    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  it('blocks confirm and surfaces the validation error when the pending value is invalid', () => {
    const onSubmit = jest.fn();
    const validate = (value: string) => (value.length > 3 ? 'too long' : null);

    const { result } = renderHook(() =>
      usePendingFieldValue<string>({ committedValue: 'a', onSubmit, validate })
    );

    act(() => result.current.setPendingValue('much too long'));

    expect(result.current.validationError).toBe('too long');

    act(() => result.current.onConfirm());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.hasPendingChange).toBe(true);
  });
});
