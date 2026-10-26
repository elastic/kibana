/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

const mockSetModelMarkers = jest.fn();

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      setModelMarkers: (...args: unknown[]) => mockSetModelMarkers(...args),
    },
    MarkerSeverity: { Error: 8, Warning: 4 },
  },
}));

const mockConditionMarkers = jest.fn();
const mockRuleMarkers = jest.fn();
jest.mock('../utils/validate_condition_field_references', () => ({
  getMissingConditionFieldMarkers: (value: string) => mockConditionMarkers(value),
}));
jest.mock('../utils/validate_field_validation_rules', () => ({
  getInapplicableValidationRuleMarkers: (value: string) => mockRuleMarkers(value),
}));

import { useSemanticValidation } from './use_semantic_validation';

const createEditor = (isDisposed = false) => {
  const model = { isDisposed: () => isDisposed };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial Monaco editor test double
  return { getModel: () => model } as any;
};

describe('useSemanticValidation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockConditionMarkers.mockReturnValue([]);
    mockRuleMarkers.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces marker writes and applies both validators after the delay', () => {
    mockRuleMarkers.mockReturnValue([
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
        message: 'bad rule',
        severity: 'warning',
      },
    ]);

    renderHook(() => useSemanticValidation(createEditor(), 'name: T'));

    // Nothing written before the debounce elapses.
    expect(mockSetModelMarkers).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
    const markers = mockSetModelMarkers.mock.calls[0][2];
    expect(markers).toHaveLength(1);
    expect(markers[0].message).toBe('bad rule');
    expect(markers[0].severity).toBe(4); // Warning
  });

  it('does not write markers when the model is disposed', () => {
    renderHook(() => useSemanticValidation(createEditor(true), 'name: T'));
    jest.advanceTimersByTime(300);
    expect(mockSetModelMarkers).not.toHaveBeenCalled();
  });

  it('clears its markers when a validator throws', () => {
    mockConditionMarkers.mockImplementation(() => {
      throw new Error('boom');
    });

    renderHook(() => useSemanticValidation(createEditor(), 'name: T'));
    jest.advanceTimersByTime(300);

    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
    expect(mockSetModelMarkers.mock.calls[0][2]).toEqual([]);
  });

  it('clears its owner markers on unmount (model not disposed)', () => {
    const { unmount } = renderHook(() => useSemanticValidation(createEditor(), 'name: T'));
    jest.advanceTimersByTime(300);
    mockSetModelMarkers.mockClear();

    unmount();

    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
    expect(mockSetModelMarkers.mock.calls[0][2]).toEqual([]);
  });
});
