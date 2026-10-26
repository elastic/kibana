/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { KiPageTabId } from './use_ki_page_navigation';
import { useKiPageNavigation } from './use_ki_page_navigation';

const mockNavigateToContextEngine = jest.fn();
const mockOnSelectTab = jest.fn();
const mockOnDiscardConfirmed = jest.fn();
const mockOnAppLeave = jest.fn();

jest.mock('./use_navigation', () => ({
  useNavigation: () => ({
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
}));

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: { onAppLeave: mockOnAppLeave },
  }),
}));

const renderNavigation = (
  options: {
    selectedTab?: KiPageTabId;
    shouldBlockNavigation?: boolean;
  } = {}
) =>
  renderHook(() =>
    useKiPageNavigation({
      backPath: '/back',
      selectedTab: options.selectedTab ?? 'details',
      onSelectTab: mockOnSelectTab,
      shouldBlockNavigation: options.shouldBlockNavigation ?? false,
      onDiscardConfirmed: mockOnDiscardConfirmed,
    })
  );

describe('useKiPageNavigation', () => {
  beforeEach(() => {
    mockNavigateToContextEngine.mockClear();
    mockOnSelectTab.mockClear();
    mockOnDiscardConfirmed.mockClear();
    mockOnAppLeave.mockClear();
  });

  const getRegisteredLeaveAction = () => {
    const leaveHandler = mockOnAppLeave.mock.calls[mockOnAppLeave.mock.calls.length - 1][0];
    const actions = {
      confirm: jest.fn((text: string, title?: string) => ({ type: 'confirm', text, title })),
      default: jest.fn(() => ({ type: 'default' })),
    };
    leaveHandler(actions);
    return actions;
  };

  it('registers a default app-leave action when navigation is not blocked', () => {
    renderNavigation();

    const actions = getRegisteredLeaveAction();

    expect(actions.default).toHaveBeenCalled();
    expect(actions.confirm).not.toHaveBeenCalled();
  });

  it('registers a confirm app-leave action when navigation is blocked', () => {
    renderNavigation({ shouldBlockNavigation: true });

    const actions = getRegisteredLeaveAction();

    expect(actions.confirm).toHaveBeenCalled();
    expect(actions.default).not.toHaveBeenCalled();
  });

  it('resets the app-leave handler to default on unmount', () => {
    const { unmount } = renderNavigation({ shouldBlockNavigation: true });

    unmount();

    const lastHandler = mockOnAppLeave.mock.calls[mockOnAppLeave.mock.calls.length - 1][0];
    const actions = {
      confirm: jest.fn(),
      default: jest.fn(),
    };
    lastHandler(actions);

    expect(actions.default).toHaveBeenCalled();
    expect(actions.confirm).not.toHaveBeenCalled();
  });

  it('selects tab when navigation is not blocked', () => {
    const { result } = renderNavigation();

    act(() => {
      result.current.handleSelectTab('document');
    });

    expect(mockOnSelectTab).toHaveBeenCalledWith('document');
    expect(result.current.isDiscardEditsConfirmOpen).toBe(false);
  });

  it('opens discard confirm when switching tabs while navigation is blocked', () => {
    const { result } = renderNavigation({ shouldBlockNavigation: true });

    act(() => {
      result.current.handleSelectTab('document');
    });

    expect(result.current.isDiscardEditsConfirmOpen).toBe(true);
    expect(mockOnSelectTab).not.toHaveBeenCalled();
  });

  it('completes pending tab navigation after discard confirm', () => {
    const { result } = renderNavigation({ shouldBlockNavigation: true });

    act(() => {
      result.current.handleSelectTab('document');
    });
    act(() => {
      result.current.completePendingNavigation();
    });

    expect(mockOnDiscardConfirmed).toHaveBeenCalled();
    expect(mockOnSelectTab).toHaveBeenCalledWith('document');
    expect(result.current.isDiscardEditsConfirmOpen).toBe(false);
  });

  it('navigates back when discard is confirmed during blocked navigation', () => {
    const { result } = renderHook(() =>
      useKiPageNavigation({
        backPath: '/ai_index/x/ki',
        selectedTab: 'details',
        onSelectTab: mockOnSelectTab,
        shouldBlockNavigation: true,
        onDiscardConfirmed: mockOnDiscardConfirmed,
      })
    );

    act(() => {
      result.current.handleBackClick({ preventDefault: jest.fn() });
    });
    act(() => {
      result.current.completePendingNavigation();
    });

    expect(mockOnDiscardConfirmed).toHaveBeenCalled();
    expect(mockNavigateToContextEngine).toHaveBeenCalledWith('/ai_index/x/ki');
    expect(result.current.isDiscardEditsConfirmOpen).toBe(false);
  });
});
