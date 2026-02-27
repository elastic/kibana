/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { TOUR_STORAGE_KEYS } from '../constants';
import { createStartServices } from '../mock';

import { useStartServices } from './use_core';
import { useDismissableTour } from './use_dismissable_tour';
import { TourManagerProvider, useTourManager } from './use_tour_manager';

jest.mock('./use_core');

describe('useDismissableTour', () => {
  let startServices: ReturnType<typeof createStartServices>;
  beforeEach(() => {
    startServices = createStartServices('/app/fleet');
    jest.mocked(useStartServices).mockReturnValue(startServices);
  });
  it('should display the tour by default', () => {
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'));

    expect(res.result.current.isHidden).toBe(false);
  });

  it('should allow to dismiss the tour', () => {
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'));
    expect(res.result.current.isHidden).toBe(false);

    act(() => res.result.current.dismiss());

    expect(res.result.current.isHidden).toBe(true);
    const storageValue = startServices.storage.get(TOUR_STORAGE_KEYS.GRANULAR_PRIVILEGES);
    expect(storageValue).toBeDefined();
    expect(storageValue.active).toEqual(false);
  });

  it('should not display the tour if tours are disabled', () => {
    jest.mocked(startServices.notifications.tours.isEnabled).mockReturnValue(false);
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'));

    expect(res.result.current.isHidden).toBe(true);
  });

  it('should not display the tour if it is already dismissed', () => {
    startServices.storage.set(TOUR_STORAGE_KEYS.GRANULAR_PRIVILEGES, {
      active: false,
    });
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'));

    expect(res.result.current.isHidden).toBe(true);
  });

  it('should not display the tour when enabled is false', () => {
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES', false));

    expect(res.result.current.isOpen).toBe(false);
  });

  it('should display the tour when enabled is true and not dismissed', () => {
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES', true));

    expect(res.result.current.isOpen).toBe(true);
  });

  it('should coordinate with tour manager - respond to active tour state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    // Test that when a tour manager has an active tour, it affects isOpen calculation
    const { result } = renderHook(
      () => {
        const tourManager = useTourManager();
        const tour = useDismissableTour('GRANULAR_PRIVILEGES');
        return { tourManager, tour };
      },
      { wrapper }
    );

    // Initially tour should be open
    expect(result.current.tour.isOpen).toBe(true);

    // When we set a different tour as active, this tour should not be open
    act(() => {
      result.current.tourManager.setActiveTour('AUTO_UPGRADE_AGENTS');
    });

    expect(result.current.tour.isOpen).toBe(false);

    // When we set this tour as active, it should be open again
    act(() => {
      result.current.tourManager.setActiveTour('GRANULAR_PRIVILEGES');
    });

    expect(result.current.tour.isOpen).toBe(true);
  });

  it('should work without tour manager context (fallback behavior)', () => {
    // Render without TourManagerProvider wrapper
    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'));

    expect(res.result.current.isHidden).toBe(false);

    act(() => res.result.current.dismiss());

    expect(res.result.current.isHidden).toBe(true);
  });

  it('should properly manage tour manager state when tour becomes active', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'), { wrapper });

    // Tour should be visible and set as active tour
    expect(res.result.current.isOpen).toBe(true);
  });

  it('should clear tour manager state when tour is dismissed', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TourManagerProvider, { children });

    const res = renderHook(() => useDismissableTour('GRANULAR_PRIVILEGES'), { wrapper });
    expect(res.result.current.isOpen).toBe(true);

    act(() => res.result.current.dismiss());

    // Tour should be cleared from active tour manager state
    expect(res.result.current.isOpen).toBe(false);
  });
});
