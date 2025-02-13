/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { TOUR_STORAGE_KEYS } from '../constants';
import { createStartServices } from '../mock';

import { useStartServices } from './use_core';
import { useDismissableTour } from './use_dismissable_tour';

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

  it('should not display the tour if hideAnnouncements:true', () => {
    jest.mocked(startServices.uiSettings.get).mockReturnValue(true);
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
});
