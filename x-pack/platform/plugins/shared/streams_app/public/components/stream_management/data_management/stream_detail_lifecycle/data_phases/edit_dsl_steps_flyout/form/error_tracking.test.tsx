/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  OnStepFieldErrorsChangeProvider,
  useDslStepsFlyoutTabErrors,
  useOnStepFieldErrorsChange,
} from './error_tracking';

const stepPath = (index: number) => `_meta.downsampleSteps[${index}]`;

describe('useDslStepsFlyoutTabErrors', () => {
  const useHook = () => {
    const renderCountRef = React.useRef(0);
    renderCountRef.current += 1;
    return { ...useDslStepsFlyoutTabErrors(), renderCount: renderCountRef.current };
  };

  it('reports no errors by default', () => {
    const { result } = renderHook(() => useHook());
    expect(result.current.tabHasErrors(stepPath(0))).toBe(false);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(false);
  });

  it('tracks after and fixed_interval errors per step', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['required']);
    });
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(false);

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', null);
    });
    expect(result.current.tabHasErrors(stepPath(0))).toBe(false);

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['integer']);
    });
    expect(result.current.tabHasErrors(stepPath(0))).toBe(false);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);
  });

  it('does not re-render when setting the same errors (isEqual shortcut)', () => {
    const { result } = renderHook(() => useHook());
    expect(result.current.renderCount).toBe(1);

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'fixed_interval', ['integer']);
    });
    expect(result.current.renderCount).toBe(2);

    // Same content (different reference) should not trigger an update.
    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'fixed_interval', ['integer']);
    });
    expect(result.current.renderCount).toBe(2);
  });

  it('prunes errors to the provided step paths', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['required']);
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['integer']);
      result.current.onStepFieldErrorsChange(stepPath(2), 'after', ['required']);
    });

    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(2))).toBe(true);

    act(() => {
      result.current.pruneToStepPaths([stepPath(0), stepPath(2)]);
    });

    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(false);
    expect(result.current.tabHasErrors(stepPath(2))).toBe(true);
  });

  it('does not re-render when pruning to the same set of step paths', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['required']);
      result.current.onStepFieldErrorsChange(stepPath(2), 'after', ['required']);
    });

    const rendersBefore = result.current.renderCount;
    act(() => {
      result.current.pruneToStepPaths([stepPath(0), stepPath(2)]);
    });
    expect(result.current.renderCount).toBe(rendersBefore);
  });

  it('reindexes errors after removing a middle step (drops removed, shifts higher indices down)', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['e0']);
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['e1']);
      result.current.onStepFieldErrorsChange(stepPath(2), 'after', ['e2']);
    });

    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);
    expect(result.current.tabHasErrors(stepPath(2))).toBe(true);

    act(() => {
      result.current.reindexErrorsAfterRemoval(1);
    });

    // step 0 unchanged
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    // old step 1 was removed => no longer has errors
    // old step 2 shifted to step 1 => still has errors
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);
    // old step 2 moved, so step 2 is now empty in the error map
    expect(result.current.tabHasErrors(stepPath(2))).toBe(false);
  });

  it('does not keep removed-step field errors when reindexing', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      // Removed step has a fixed_interval error.
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['integer']);
      // Next step has an after error (this should shift down).
      result.current.onStepFieldErrorsChange(stepPath(2), 'after', ['required']);
    });

    act(() => {
      result.current.reindexErrorsAfterRemoval(1);
    });

    // New step 1 should only have the shifted "after" error.
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);

    act(() => {
      // Clearing the shifted "after" error should clear all errors for step 1.
      result.current.onStepFieldErrorsChange(stepPath(1), 'after', null);
    });
    expect(result.current.tabHasErrors(stepPath(1))).toBe(false);
  });

  it('reindexes errors after removing the first step (shifts everything down)', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['e0']);
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['e1']);
    });

    act(() => {
      result.current.reindexErrorsAfterRemoval(0);
    });

    // old step 1 -> new step 0
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
    // old step 0 removed and old step 1 shifted => step 1 should be empty
    expect(result.current.tabHasErrors(stepPath(1))).toBe(false);
  });

  it('does nothing for negative removed indices', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['e0']);
    });
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);

    const rendersBefore = result.current.renderCount;
    act(() => {
      result.current.reindexErrorsAfterRemoval(-1);
    });

    expect(result.current.renderCount).toBe(rendersBefore);
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
  });

  it('does nothing when reindexing a removed index beyond existing step paths', () => {
    const { result } = renderHook(() => useHook());

    act(() => {
      result.current.onStepFieldErrorsChange(stepPath(0), 'after', ['e0']);
    });

    const rendersBefore = result.current.renderCount;
    act(() => {
      result.current.reindexErrorsAfterRemoval(10);
    });

    expect(result.current.renderCount).toBe(rendersBefore);
    expect(result.current.tabHasErrors(stepPath(0))).toBe(true);
  });

  it('preserves errors for non-step paths when reindexing', () => {
    const { result } = renderHook(() => useHook());
    const unknownPath = '_meta.someOtherThing';

    act(() => {
      result.current.onStepFieldErrorsChange(unknownPath, 'after', ['x']);
      result.current.onStepFieldErrorsChange(stepPath(1), 'fixed_interval', ['e1']);
    });

    expect(result.current.tabHasErrors(unknownPath)).toBe(true);
    expect(result.current.tabHasErrors(stepPath(1))).toBe(true);

    act(() => {
      result.current.reindexErrorsAfterRemoval(0);
    });

    expect(result.current.tabHasErrors(unknownPath)).toBe(true);
  });
});

describe('OnStepFieldErrorsChangeProvider / useOnStepFieldErrorsChange', () => {
  it('provides the callback via context', () => {
    const callback = jest.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnStepFieldErrorsChangeProvider value={callback}>{children}</OnStepFieldErrorsChangeProvider>
    );

    const { result } = renderHook(() => useOnStepFieldErrorsChange(), { wrapper });
    expect(result.current).toBe(callback);
  });
});
