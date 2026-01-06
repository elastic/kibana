/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { TourManagerProvider, useTourManager } from './use_tour_manager';

describe('useTourManager', () => {
  it('should provide tour manager context with initial state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const { result } = renderHook(() => useTourManager(), { wrapper });

    expect(result.current.activeTour).toBe(null);
    expect(typeof result.current.setActiveTour).toBe('function');
  });

  it('should update activeTour state when setActiveTour is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const { result } = renderHook(() => useTourManager(), { wrapper });

    expect(result.current.activeTour).toBe(null);

    act(() => {
      result.current.setActiveTour('GRANULAR_PRIVILEGES');
    });

    expect(result.current.activeTour).toBe('GRANULAR_PRIVILEGES');
  });

  it('should allow clearing the active tour', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const { result } = renderHook(() => useTourManager(), { wrapper });

    // Set an active tour
    act(() => {
      result.current.setActiveTour('AUTO_UPGRADE_AGENTS');
    });

    expect(result.current.activeTour).toBe('AUTO_UPGRADE_AGENTS');

    // Clear the active tour
    act(() => {
      result.current.setActiveTour(null);
    });

    expect(result.current.activeTour).toBe(null);
  });

  it('should provide fallback behavior when context is not available', () => {
    // Render without TourManagerProvider wrapper
    const { result } = renderHook(() => useTourManager());

    expect(result.current.activeTour).toBe(null);
    expect(typeof result.current.setActiveTour).toBe('function');

    // Should not throw when calling setActiveTour
    act(() => {
      result.current.setActiveTour('GRANULAR_PRIVILEGES');
    });

    // Should remain null since there's no context
    expect(result.current.activeTour).toBe(null);
  });

  it('should handle multiple tour updates in sequence', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const { result } = renderHook(() => useTourManager(), { wrapper });

    const tours = ['GRANULAR_PRIVILEGES', 'AUTO_UPGRADE_AGENTS', 'AGENT_CSV_EXPORT'];

    tours.forEach((tourId) => {
      act(() => {
        result.current.setActiveTour(tourId);
      });

      expect(result.current.activeTour).toBe(tourId);
    });
  });

  it('should maintain state across multiple hook instances with same provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    // Both hooks need to be rendered with the same wrapper instance
    const { result: hook1Result } = renderHook(() => useTourManager(), { wrapper });

    expect(hook1Result.current.activeTour).toBe(null);

    // Update state
    act(() => {
      hook1Result.current.setActiveTour('GRANULAR_PRIVILEGES');
    });

    // State should be updated
    expect(hook1Result.current.activeTour).toBe('GRANULAR_PRIVILEGES');

    // Clear state
    act(() => {
      hook1Result.current.setActiveTour('AUTO_UPGRADE_AGENTS');
    });

    // State should be updated again
    expect(hook1Result.current.activeTour).toBe('AUTO_UPGRADE_AGENTS');
  });
});
