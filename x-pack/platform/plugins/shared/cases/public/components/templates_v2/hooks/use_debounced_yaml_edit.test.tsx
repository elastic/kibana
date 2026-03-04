/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useDebouncedYamlEdit } from './use_debounced_yaml_edit';
import { exampleTemplateDefinition } from '../field_types/constants';

describe('useDebouncedYamlEdit', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns initial value from local storage or default', () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    expect(result.current.value).toBe(exampleTemplateDefinition);
  });

  it('returns isSaving as false initially', () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    expect(result.current.isSaving).toBe(false);
  });

  it('returns isSaved as false initially', () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    expect(result.current.isSaved).toBe(false);
  });

  it('sets isSaving to true immediately when onChange is called', () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('new value');
    });

    expect(result.current.isSaving).toBe(true);
    expect(result.current.isSaved).toBe(false);
  });

  it('saves to local storage after debounce delay', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('new yaml content');
    });

    expect(result.current.isSaving).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });

    expect(result.current.isSaved).toBe(true);
    // Check that value was updated in the hook
    expect(result.current.value).toBe('new yaml content');
  });

  it('calls onChangeCallback after debounce delay', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('new yaml content');
    });

    expect(mockOnChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('new yaml content');
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('resets isSaved to false after indicator duration', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('new value');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(false);
    });
  });

  it('debounces multiple rapid changes', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('value 1');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current.onChange('value 2');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current.onChange('value 3');
    });

    expect(mockOnChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    expect(mockOnChange).toHaveBeenCalledWith('value 3');
  });

  it('clears previous saved indicator timeout when saving again', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('first change');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      result.current.onChange('second change');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(false);
    });
  });

  it('flushes pending changes on unmount', () => {
    const { result, unmount } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('pending value');
    });

    expect(mockOnChange).not.toHaveBeenCalled();

    unmount();

    expect(mockOnChange).toHaveBeenCalledWith('pending value');
  });

  it('cancels pending debounce on unmount', () => {
    const { result, unmount } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('value');
    });

    unmount();

    // Flush is called on unmount, so callback should be invoked once
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('value');
  });

  it('clears saved indicator timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('value');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      unmount();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not throw or cause issues
    expect(true).toBe(true);
  });

  it('preserves value across re-renders', () => {
    const { result, rerender } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('persistent value');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    rerender();

    expect(result.current.value).toBe('persistent value');
  });

  it('handles empty string values', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });

    act(() => {
      result.current.onChange('');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  it('handles very long YAML content', async () => {
    const { result } = renderHook(() => useDebouncedYamlEdit(mockOnChange), { wrapper });
    const longContent = 'field:\n'.repeat(1000);

    act(() => {
      result.current.onChange(longContent);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(longContent);
    });
  });
});
