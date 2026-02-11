/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useStartServices } from './use_core';
import { useAgentlessResources } from './use_agentless_resources';

jest.mock('./use_core');

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

describe('useAgentlessResources hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStartServices.mockReturnValue({
      storage: mockStorage,
    } as any);
  });

  it('should initialize with false by default', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useAgentlessResources());

    expect(result.current.showAgentless).toBe(false);
    expect(typeof result.current.setShowAgentless).toBe('function');
  });

  it('should initialize with stored value when available', () => {
    mockStorage.get.mockReturnValue(true);
    const { result } = renderHook(() => useAgentlessResources());

    expect(result.current.showAgentless).toBe(true);
  });

  it('should update both state and storage when setting value', () => {
    mockStorage.get.mockReturnValue(false);
    const { result } = renderHook(() => useAgentlessResources());

    expect(result.current.showAgentless).toBe(false);

    act(() => {
      result.current.setShowAgentless(true);
    });

    expect(result.current.showAgentless).toBe(true);
    expect(mockStorage.set).toHaveBeenCalledWith('fleet:showAgentlessResources', true);
  });

  it('should handle storage errors gracefully but still update state', () => {
    mockStorage.get.mockReturnValue(false);
    mockStorage.set.mockImplementation(() => {
      throw new Error('Storage not available');
    });

    const { result } = renderHook(() => useAgentlessResources());

    expect(() => {
      act(() => {
        result.current.setShowAgentless(true);
      });
    }).not.toThrow();

    // State should still be updated even if storage fails
    expect(result.current.showAgentless).toBe(true);
  });

  it('should handle storage read errors gracefully', () => {
    mockStorage.get.mockImplementation(() => {
      throw new Error('Storage not available');
    });

    const { result } = renderHook(() => useAgentlessResources());
    expect(result.current.showAgentless).toBe(false);
  });
});
