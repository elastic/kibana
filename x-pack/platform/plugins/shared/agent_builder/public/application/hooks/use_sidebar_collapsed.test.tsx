/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { useSidebarCollapsed } from './use_sidebar_collapsed';

const renderSidebarCollapsed = (history: MemoryHistory) =>
  renderHook(() => useSidebarCollapsed(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    ),
  });

describe('useSidebarCollapsed', () => {
  it('starts expanded when the param is absent', () => {
    const history = createMemoryHistory({ initialEntries: ['/conversations/1?foo=bar'] });

    const { result } = renderSidebarCollapsed(history);

    expect(result.current[0]).toBe(false);
    expect(history.location.search).toBe('?foo=bar');
  });

  it('starts collapsed when the param is present', () => {
    const history = createMemoryHistory({
      initialEntries: ['/conversations/1?sidebarCollapsed=true'],
    });

    const { result } = renderSidebarCollapsed(history);

    expect(result.current[0]).toBe(true);
  });

  it('removes only the param and keeps pathname, hash, state and other params', () => {
    const history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/conversations/1',
          search: '?openConversationDetails=true&sidebarCollapsed=true',
          hash: '#section',
          state: { from: 'test' },
        },
      ],
    });

    renderSidebarCollapsed(history);

    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: '/conversations/1',
        search: '?openConversationDetails=true',
        hash: '#section',
        state: { from: 'test' },
      })
    );
  });

  it('toggles without touching the URL', () => {
    const history = createMemoryHistory({
      initialEntries: ['/conversations/1?sidebarCollapsed=true'],
    });
    const { result } = renderSidebarCollapsed(history);
    const { key } = history.location;

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);

    expect(history.location.key).toBe(key);
    expect(history.location.search).toBe('');
  });

  it('opens expanded after a reload once the param was consumed', () => {
    const history = createMemoryHistory({
      initialEntries: ['/conversations/1?sidebarCollapsed=true'],
    });
    renderSidebarCollapsed(history).unmount();

    const { result } = renderSidebarCollapsed(history);

    expect(result.current[0]).toBe(false);
  });

  it('collapses and consumes the param on in-app navigation', () => {
    const history = createMemoryHistory({ initialEntries: ['/conversations/1'] });
    const { result } = renderSidebarCollapsed(history);
    expect(result.current[0]).toBe(false);

    act(() => history.push('/conversations/2?openConversationDetails=true&sidebarCollapsed=true'));

    expect(result.current[0]).toBe(true);
    expect(history.location.pathname).toBe('/conversations/2');
    expect(history.location.search).toBe('?openConversationDetails=true');
  });

  it('stays collapsed on later navigation without the param', () => {
    const history = createMemoryHistory({
      initialEntries: ['/conversations/1?sidebarCollapsed=true'],
    });
    const { result } = renderSidebarCollapsed(history);

    act(() => history.push('/conversations/2'));

    expect(result.current[0]).toBe(true);
  });
});
