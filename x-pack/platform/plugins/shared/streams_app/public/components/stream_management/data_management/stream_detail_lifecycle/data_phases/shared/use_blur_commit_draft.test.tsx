/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useBlurCommitDraft } from './use_blur_commit_draft';

describe('useBlurCommitDraft', () => {
  it('keeps a draft value while editing and commits only on blur', () => {
    const onCommit = jest.fn();
    const onFieldBlur = jest.fn();
    const onAfterCommit = jest.fn();

    const { result } = renderHook(() =>
      useBlurCommitDraft({
        committedValue: '40',
        onCommit,
        onFieldBlur,
        onAfterCommit,
      })
    );

    act(() => {
      result.current.onChange('10');
    });
    expect(result.current.draftValue).toBe('10');
    expect(onCommit).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.onBlur();
    });
    expect(onFieldBlur).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith('10');
    expect(onAfterCommit).toHaveBeenCalledTimes(1);
  });

  it('restores the committed value when cleared and blurred (no commit)', () => {
    const onCommit = jest.fn();
    const onAfterCommit = jest.fn();

    const { result } = renderHook(() =>
      useBlurCommitDraft({
        committedValue: '40',
        onCommit,
        onAfterCommit,
      })
    );

    act(() => {
      result.current.onChange('');
    });
    expect(result.current.draftValue).toBe('');
    expect(onCommit).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.onBlur();
    });
    expect(result.current.draftValue).toBe('40');
    expect(onCommit).toHaveBeenCalledTimes(0);
    expect(onAfterCommit).toHaveBeenCalledTimes(0);
  });

  it('syncs draft from committed value when not editing', () => {
    const onCommit = jest.fn();

    const { result, rerender } = renderHook(
      ({ committedValue }) =>
        useBlurCommitDraft({
          committedValue,
          onCommit,
        }),
      { initialProps: { committedValue: '40' } }
    );

    expect(result.current.draftValue).toBe('40');

    rerender({ committedValue: '50' });
    expect(result.current.draftValue).toBe('50');
  });

  it('does not commit or update when disabled', () => {
    const onCommit = jest.fn();
    const onFieldBlur = jest.fn();

    const { result } = renderHook(() =>
      useBlurCommitDraft({
        committedValue: '40',
        isDisabled: true,
        onCommit,
        onFieldBlur,
      })
    );

    act(() => {
      result.current.onChange('10');
    });
    expect(result.current.draftValue).toBe('40');

    act(() => {
      result.current.onBlur();
    });
    expect(onFieldBlur).toHaveBeenCalledTimes(0);
    expect(onCommit).toHaveBeenCalledTimes(0);
  });
});
