/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import {
  createKiGraphUiStore,
  KiGraphUiStoreProvider,
  useKiGraphUiStore,
  useKiGraphUiStoreActions,
} from './ki_graph_ui_store';
import type { KiGraphEdge } from './types';

const edge = (source: string, target: string): KiGraphEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  relation: 'derived_from',
});

const wrapWithProvider = (edges: readonly KiGraphEdge[] = []) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KiGraphUiStoreProvider edges={edges}>{children}</KiGraphUiStoreProvider>
  );
  return { wrapper };
};

describe('createKiGraphUiStore', () => {
  it('builds highlight neighbors when hovering', () => {
    const store = createKiGraphUiStore();
    store.setEdges([edge('a', 'b'), edge('b', 'c')]);
    store.setHoveredId('b');

    const { focusId, focusActive, highlightIds } = store.getState();
    expect(focusId).toBe('b');
    expect(focusActive).toBe(true);
    expect(highlightIds?.has('a')).toBe(true);
    expect(highlightIds?.has('b')).toBe(true);
    expect(highlightIds?.has('c')).toBe(true);
  });

  it('clears focus when hover ends', () => {
    const store = createKiGraphUiStore();
    store.setEdges([edge('a', 'b')]);
    store.setHoveredId('a');
    store.setHoveredId(undefined);

    const { focusActive, highlightIds } = store.getState();
    expect(focusActive).toBe(false);
    expect(highlightIds).toBeUndefined();
  });

  it('prefers hover over selection for focus', () => {
    const store = createKiGraphUiStore();
    store.setEdges([edge('a', 'b'), edge('c', 'd')]);
    store.setSelectedId('a');
    store.setHoveredId('c');

    expect(store.getState().focusId).toBe('c');
  });
});

describe('KiGraphUiStoreProvider hooks', () => {
  it('throws when useKiGraphUiStore is used without the provider', () => {
    expect(() => {
      renderHook(() => useKiGraphUiStore((state) => state.focusActive));
    }).toThrow('Ki graph UI store hooks must be used within KiGraphUiStoreProvider');
  });

  it('exposes actions and state inside the provider', () => {
    const { wrapper } = wrapWithProvider([edge('a', 'b')]);
    const { result } = renderHook(
      () => ({
        actions: useKiGraphUiStoreActions(),
        focusId: useKiGraphUiStore((state) => state.focusId),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.setHoveredId('a');
    });

    expect(result.current.focusId).toBe('a');
  });
});
