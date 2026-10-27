/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { useLandingTabs } from './use_landing_tabs';
import { useMemoryEnabled } from './use_memory_enabled';
import { useNavigation } from './use_navigation';

jest.mock('./use_memory_enabled', () => ({ useMemoryEnabled: jest.fn() }));
jest.mock('./use_navigation', () => ({ useNavigation: jest.fn() }));

const mockUseMemoryEnabled = jest.mocked(useMemoryEnabled);
const mockUseNavigation = jest.mocked(useNavigation);

describe('useLandingTabs', () => {
  const navigateToContextEngine = jest.fn();

  const renderTabs = (path: string) =>
    renderHook(() => useLandingTabs(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      ),
    });

  beforeEach(() => {
    mockUseMemoryEnabled.mockReturnValue(true);
    mockUseNavigation.mockReturnValue({
      navigateToContextEngine,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('has no tabs while memory is off', () => {
    mockUseMemoryEnabled.mockReturnValue(false);

    expect(renderTabs(CONTEXT_ENGINE_PATHS.landing).result.current).toBeUndefined();
  });

  it('selects the AI indices tab on the landing page', () => {
    const tabs = renderTabs(CONTEXT_ENGINE_PATHS.landing).result.current;

    expect(tabs?.map(({ id, isSelected }) => ({ id, isSelected }))).toEqual([
      { id: 'ai_indices', isSelected: true },
      { id: 'memory', isSelected: false },
    ]);
  });

  it('selects the Memory tab on the memory page and navigates between tabs', () => {
    const tabs = renderTabs(CONTEXT_ENGINE_PATHS.memory).result.current;

    expect(tabs?.find(({ id }) => id === 'memory')?.isSelected).toBe(true);

    tabs?.find(({ id }) => id === 'ai_indices')?.onClick?.();
    expect(navigateToContextEngine).toHaveBeenCalledWith(CONTEXT_ENGINE_PATHS.landing);
  });
});
