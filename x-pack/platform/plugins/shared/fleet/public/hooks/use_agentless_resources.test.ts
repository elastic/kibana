/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useStartServices } from './use_core';
import {
  useShowAgentlessResourcesFlag,
  useSetShowAgentlessResourcesFlag,
  useAgentlessResourcesToggle,
} from './use_agentless_resources';

jest.mock('./use_core');

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

describe('useAgentlessResources hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStartServices.mockReturnValue({
      storage: mockStorage,
    } as any);
  });

  describe('useShowAgentlessResourcesFlag', () => {
    it('should return false by default', () => {
      mockStorage.get.mockReturnValue(undefined);
      const { result } = renderHook(() => useShowAgentlessResourcesFlag());
      expect(result.current).toBe(false);
    });

    it('should return true when stored as true', () => {
      mockStorage.get.mockReturnValue(true);
      const { result } = renderHook(() => useShowAgentlessResourcesFlag());
      expect(result.current).toBe(true);
    });

    it('should handle storage errors gracefully', () => {
      mockStorage.get.mockImplementation(() => {
        throw new Error('Storage not available');
      });
      const { result } = renderHook(() => useShowAgentlessResourcesFlag());
      expect(result.current).toBe(false);
    });
  });

  describe('useSetShowAgentlessResourcesFlag', () => {
    it('should set the storage value', () => {
      const { result } = renderHook(() => useSetShowAgentlessResourcesFlag());

      act(() => {
        result.current(true);
      });

      expect(mockStorage.set).toHaveBeenCalledWith('fleet:showAgentlessResources', true);
    });

    it('should handle storage errors gracefully', () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const { result } = renderHook(() => useSetShowAgentlessResourcesFlag());

      expect(() => {
        act(() => {
          result.current(true);
        });
      }).not.toThrow();
    });
  });

  describe('useAgentlessResourcesToggle', () => {
    it('should provide both getter and setter', () => {
      mockStorage.get.mockReturnValue(false);
      const { result } = renderHook(() => useAgentlessResourcesToggle());

      expect(result.current.showAgentless).toBe(false);
      expect(typeof result.current.setShowAgentless).toBe('function');

      act(() => {
        result.current.setShowAgentless(true);
      });

      expect(mockStorage.set).toHaveBeenCalledWith('fleet:showAgentlessResources', true);
    });
  });
});
