/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useSidebarAccordionsState } from './use_sidebar_accordions_state';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';

const mockUseCasesLocalStorage = jest.fn();
jest.mock('../../../../../../common/use_cases_local_storage', () => ({
  useCasesLocalStorage: (...args: unknown[]) => mockUseCasesLocalStorage(...args),
}));

describe('useSidebarAccordionsState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCasesLocalStorage.mockReturnValue([
      {
        attributes: true,
        legacyCustomFields: false,
        templateFields: false,
        connectors: true,
      },
      jest.fn(),
    ]);
  });

  it('uses the sidebar accordions local storage key', () => {
    renderHook(() => useSidebarAccordionsState());

    expect(mockUseCasesLocalStorage).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.caseViewSidebarAccordions,
      {
        attributes: true,
        legacyCustomFields: false,
        templateFields: true,
        connectors: true,
      }
    );
  });

  it('returns persisted open state for each accordion', () => {
    const { result } = renderHook(() => useSidebarAccordionsState());

    expect(result.current.isOpen('attributes')).toBe(true);
    expect(result.current.isOpen('legacyCustomFields')).toBe(false);
    expect(result.current.isOpen('templateFields')).toBe(false);
    expect(result.current.isOpen('connectors')).toBe(true);
  });

  it('updates persisted state when toggling an accordion', () => {
    const setAccordionsState = jest.fn();
    mockUseCasesLocalStorage.mockReturnValue([
      {
        attributes: true,
        legacyCustomFields: false,
        templateFields: true,
        connectors: true,
      },
      setAccordionsState,
    ]);

    const { result } = renderHook(() => useSidebarAccordionsState());

    act(() => {
      result.current.onToggle('templateFields', false);
    });

    expect(setAccordionsState).toHaveBeenCalledWith({
      attributes: true,
      legacyCustomFields: false,
      templateFields: false,
      connectors: true,
    });
  });
});
