/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY,
  useDisplayOptionsTour,
} from './use_display_options_tour';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const mockTours = (enabled: boolean) => {
  mockUseKibana.mockReturnValue({
    services: { notifications: { tours: { isEnabled: () => enabled } } },
  });
};

describe('useDisplayOptionsTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockTours(true);
  });

  it('keeps the tour closed when no models are region-blocked', () => {
    const { result } = renderHook(() => useDisplayOptionsTour(false));
    expect(result.current.isTourOpen).toBe(false);
  });

  it('opens the tour when models are region-blocked', () => {
    const { result } = renderHook(() => useDisplayOptionsTour(true));
    expect(result.current.isTourOpen).toBe(true);
  });

  it('keeps the tour closed when tours are disabled', () => {
    mockTours(false);
    const { result } = renderHook(() => useDisplayOptionsTour(true));
    expect(result.current.isTourOpen).toBe(false);
  });

  it('permanently dismisses the tour from dismissTour', () => {
    const { result } = renderHook(() => useDisplayOptionsTour(true));

    act(() => {
      result.current.dismissTour();
    });

    expect(result.current.isTourOpen).toBe(false);
    expect(window.localStorage.getItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY)).toBe('true');
  });

  it('hides the tour for this page load without writing localStorage', () => {
    const { result } = renderHook(() => useDisplayOptionsTour(true));

    act(() => {
      result.current.hideTour();
    });

    expect(result.current.isTourOpen).toBe(false);
    expect(window.localStorage.getItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY)).toBeNull();
  });

  it('stays closed when localStorage already records a dismissal', () => {
    window.localStorage.setItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useDisplayOptionsTour(true));
    expect(result.current.isTourOpen).toBe(false);
  });
});
