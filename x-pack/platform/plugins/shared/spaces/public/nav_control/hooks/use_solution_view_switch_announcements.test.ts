/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import type { Capabilities } from '@kbn/core/public';

import { useSolutionViewSwitchAnnouncements } from './use_solution_view_switch_announcements';
import type { Space } from '../../../common';
import { SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX } from '../../solution_view_switch';
import { SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX } from '../solution_view_switch_tour';

const capabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
  spaces: { manage: true },
};

const baseSpace = {
  id: 'default',
  name: 'Default Space',
  disabledFeatures: [],
  solution: 'oblt',
} as Space;

describe('useSolutionViewSwitchAnnouncements', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('show notification returns true when space has been switched from classic and tour has not been seen', () => {
    localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${baseSpace.id}`, 'true');
    localStorage.setItem(
      `${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${baseSpace.id}`,
      'false'
    );

    const { result } = renderHook(() =>
      useSolutionViewSwitchAnnouncements({
        activeSpace: baseSpace,
        capabilities,
        areAnnouncementsEnabled: true,
        closeSpaceSelector: jest.fn(),
        navigateToApp: jest.fn(),
      })
    );

    expect(result.current.showNotification).toBe(true);
  });

  it('show notification returns false when space has not been switched from classic', () => {
    localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${baseSpace.id}`, 'false');
    localStorage.setItem(
      `${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${baseSpace.id}`,
      'false'
    );

    const { result } = renderHook(() =>
      useSolutionViewSwitchAnnouncements({
        activeSpace: baseSpace,
        capabilities,
        areAnnouncementsEnabled: true,
        closeSpaceSelector: jest.fn(),
        navigateToApp: jest.fn(),
      })
    );

    expect(result.current.showNotification).toBe(false);
  });

  it('show notification returns false when user cannot manage spaces', () => {
    localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${baseSpace.id}`, 'true');
    localStorage.setItem(
      `${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${baseSpace.id}`,
      'false'
    );

    const { result } = renderHook(() =>
      useSolutionViewSwitchAnnouncements({
        activeSpace: baseSpace,
        capabilities: {
          ...capabilities,
          spaces: { manage: false },
        },
        areAnnouncementsEnabled: true,
        closeSpaceSelector: jest.fn(),
        navigateToApp: jest.fn(),
      })
    );

    expect(result.current.showNotification).toBe(false);
  });

  it('marks tour as seen on finish and toggles notification to false', () => {
    localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${baseSpace.id}`, 'true');
    localStorage.setItem(
      `${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${baseSpace.id}`,
      'false'
    );

    const { result } = renderHook(() =>
      useSolutionViewSwitchAnnouncements({
        activeSpace: baseSpace,
        capabilities,
        areAnnouncementsEnabled: true,
        closeSpaceSelector: jest.fn(),
        navigateToApp: jest.fn(),
      })
    );

    expect(result.current.showNotification).toBe(true);
    expect(result.current.tourProps).not.toBeNull();

    act(() => {
      result.current.tourProps!.onFinish();
    });

    expect(
      localStorage.getItem(`${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${baseSpace.id}`)
    ).toBe('true');
    expect(result.current.showNotification).toBe(false);
  });
});
