/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useControllableState } from './use_controllable_state';
import { renderHook } from '@testing-library/react';

describe('useControllableState', () => {
  it('should initialize the value to `defaultValue` if `value` is not provided', () => {
    const { result } = renderHook(() =>
      useControllableState({
        defaultValue: 'defaultValue',
      })
    );

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should call onChange with the correct value with when the state is controlled (`value` and `onChange` both defined)', () => {
    let controlledState = 'propValue';
    const onChange = jest.fn((newValue) => {
      controlledState = newValue;
    });

    const { result } = renderHook(() =>
      useControllableState({
        value: controlledState,
        onChange,
        defaultValue: 'defaultValue',
      })
    );

    const [_, setState] = result.current;

    const newPropValue = 'newPropValue';
    setState(newPropValue);

    expect(onChange).toHaveBeenCalledWith(newPropValue);
    expect(controlledState).toEqual(newPropValue);
  });

  it('should call `onChange` with the correct value with when the state is uncontrolled', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useControllableState({
        onChange,
        defaultValue: 'defaultValue',
      })
    );

    const [_, setState] = result.current;

    setState('newInternalValue');

    expect(onChange).toHaveBeenCalledWith('newInternalValue');
  });

  it('should not call `onChange` on initial render', () => {
    const onChange = jest.fn();
    renderHook(() =>
      useControllableState({
        value: 'propValue',
        onChange,
        defaultValue: 'defaultValue',
      })
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should update the state if the `value` prop changes', () => {
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      (props) =>
        useControllableState({
          ...props,
        }),
      {
        initialProps: {
          value: 'propValue',
          onChange,
          defaultValue: 'defaultValue',
        },
      }
    );

    expect(result.current[0]).toBe('propValue');

    rerender({
      value: 'newPropValue',
      onChange,
      defaultValue: 'defaultValue',
    });

    expect(result.current[0]).toBe('newPropValue');
    expect(onChange).not.toHaveBeenCalled();
  });
});
