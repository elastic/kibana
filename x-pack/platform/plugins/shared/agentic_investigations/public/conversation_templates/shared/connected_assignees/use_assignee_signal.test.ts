/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { assigneeSignal } from './assignee_overrides';
import { useAssigneeSignal } from './use_assignee_signal';

// Reset the signal store between tests so bumps from one test don't bleed into the next.
// The store is module-level state; we clear it by bumping past any existing versions.
afterEach(() => jest.clearAllMocks());

describe('useAssigneeSignal', () => {
  it('does not call onBump on mount', () => {
    const onBump = jest.fn();
    renderHook(() => useAssigneeSignal(onBump));
    expect(onBump).not.toHaveBeenCalled();
  });

  it('calls onBump with the changed id when the signal bumps', () => {
    const onBump = jest.fn();
    renderHook(() => useAssigneeSignal(onBump));

    act(() => {
      assigneeSignal.bump('conv-1');
    });

    expect(onBump).toHaveBeenCalledTimes(1);
    expect(onBump).toHaveBeenCalledWith(['conv-1']);
  });

  it('reports only the ids whose version actually changed', () => {
    const onBump = jest.fn();
    renderHook(() => useAssigneeSignal(onBump));

    act(() => {
      assigneeSignal.bump('conv-1');
    });
    act(() => {
      assigneeSignal.bump('conv-2');
    });

    expect(onBump).toHaveBeenNthCalledWith(1, ['conv-1']);
    expect(onBump).toHaveBeenNthCalledWith(2, ['conv-2']);
  });

  it('does not call onBump when nothing bumped between renders', () => {
    const onBump = jest.fn();
    const { rerender } = renderHook(() => useAssigneeSignal(onBump));
    rerender();
    expect(onBump).not.toHaveBeenCalled();
  });

  it('always uses the latest onBump even if the prop identity changes', () => {
    const first = jest.fn();
    const second = jest.fn();
    let cb = first;
    const { rerender } = renderHook(() => useAssigneeSignal(cb));

    cb = second;
    rerender();

    act(() => {
      assigneeSignal.bump('conv-x');
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(['conv-x']);
  });
});
