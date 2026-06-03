/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useSpaceItems } from './use_space_items';
import type { Space } from '../../../common';

jest.mock('../../space_avatar', () => ({
  getSpaceAvatarComponent: () => Promise.resolve(() => null),
}));

jest.mock('../../space_solution_badge', () => ({
  SpaceSolutionBadge: () => null,
}));

const createSpace = (overrides: Partial<Space> = {}): Space => ({
  id: 'test-space',
  name: 'Test Space',
  disabledFeatures: [],
  ...overrides,
});

describe('useSpaceItems', () => {
  it('maps spaces to space items and sets the active space item', () => {
    const spaces = [
      createSpace({ id: 'alpha', name: 'Alpha' }),
      createSpace({ id: 'beta', name: 'Beta' }),
    ];

    const { result } = renderHook(() =>
      useSpaceItems({
        spaces,
        activeSpace: spaces[1],
        allowSolutionVisibility: false,
      })
    );

    expect(result.current.spaceItems).toHaveLength(2);
    expect(result.current.spaceItems[0]).toMatchObject({ id: 'alpha', name: 'Alpha' });
    expect(result.current.spaceItems[1]).toMatchObject({ id: 'beta', name: 'Beta' });
    expect(result.current.activeSpaceItem).toMatchObject({ id: 'beta', name: 'Beta' });
  });

  it('includes solution label when allowSolutionVisibility is true', () => {
    const spaces = [createSpace({ id: 'sec', name: 'Security', solution: 'security' })];

    const { result } = renderHook(() =>
      useSpaceItems({
        spaces,
        activeSpace: spaces[0],
        allowSolutionVisibility: true,
      })
    );

    expect(result.current.spaceItems[0].solution).toBe('Security');
    expect(result.current.spaceItems[0].solutionIcon).toBe('logoSecurity');
  });

  it('omits solution info when allowSolutionVisibility is false', () => {
    const spaces = [createSpace({ id: 'sec', name: 'Security', solution: 'security' })];

    const { result } = renderHook(() =>
      useSpaceItems({
        spaces,
        activeSpace: spaces[0],
        allowSolutionVisibility: false,
      })
    );

    expect(result.current.spaceItems[0].solution).toBeUndefined();
    expect(result.current.spaceItems[0].solutionIcon).toBeUndefined();
  });

  it('does not show solution info on serverless even when allowSolutionVisibility is true', () => {
    const spaces = [createSpace({ id: 'a', name: 'A', solution: 'security' })];

    const { result } = renderHook(() =>
      useSpaceItems({
        spaces,
        activeSpace: spaces[0],
        isServerless: true,
        allowSolutionVisibility: true,
      })
    );

    expect(result.current.spaceItems[0].solution).toBeUndefined();
  });

  it('uses serverlessProjectType solution info for activeSpaceItem in serverless', () => {
    const spaces = [createSpace({ id: 'proj', name: 'My Project' })];

    const { result } = renderHook(() =>
      useSpaceItems({
        spaces,
        activeSpace: spaces[0],
        isServerless: true,
        allowSolutionVisibility: true,
        serverlessProjectType: 'security',
      })
    );

    expect(result.current.activeSpaceItem?.solution).toBe('Security');
    expect(result.current.activeSpaceItem?.solutionIcon).toBe('logoSecurity');
  });
});
