/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { KiGraphEdge } from './types';
import { getNeighborIds } from './use_ki_graph_layout';

export interface KiGraphUiState {
  readonly hoveredId?: string;
  readonly selectedId?: string;
  readonly focusId?: string;
  readonly focusActive: boolean;
  readonly highlightIds?: ReadonlySet<string>;
  readonly revision: number;
}

const emptyHighlight: ReadonlySet<string> | undefined = undefined;

const buildHighlightState = (
  edges: readonly KiGraphEdge[],
  hoveredId: string | undefined,
  selectedId: string | undefined
): Pick<KiGraphUiState, 'focusId' | 'focusActive' | 'highlightIds'> => {
  const focusId = hoveredId ?? selectedId;
  if (focusId === undefined) {
    return { focusId: undefined, focusActive: false, highlightIds: emptyHighlight };
  }
  return {
    focusId,
    focusActive: true,
    highlightIds: getNeighborIds(edges, focusId),
  };
};

const createInitialState = (): KiGraphUiState => ({
  focusActive: false,
  revision: 0,
});

type KiGraphUiListener = () => void;

export interface KiGraphUiStore {
  readonly subscribe: (listener: KiGraphUiListener) => () => void;
  readonly getState: () => KiGraphUiState;
  readonly setEdges: (edges: readonly KiGraphEdge[]) => void;
  readonly setSelectedId: (selectedId: string | undefined) => void;
  readonly setHoveredId: (hoveredId: string | undefined) => void;
}

export const createKiGraphUiStore = (): KiGraphUiStore => {
  let state = createInitialState();
  let edges: readonly KiGraphEdge[] = [];
  const listeners = new Set<KiGraphUiListener>();

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setState = (patch: Partial<KiGraphUiState>) => {
    state = { ...state, ...patch, revision: state.revision + 1 };
    emit();
  };

  const recomputeFocus = (hoveredId: string | undefined, selectedId: string | undefined) => {
    const focus = buildHighlightState(edges, hoveredId, selectedId);
    setState({ hoveredId, selectedId, ...focus });
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    setEdges: (nextEdges) => {
      edges = nextEdges;
      recomputeFocus(state.hoveredId, state.selectedId);
    },
    setSelectedId: (selectedId) => {
      if (state.selectedId === selectedId) {
        return;
      }
      recomputeFocus(state.hoveredId, selectedId);
    },
    setHoveredId: (hoveredId) => {
      if (state.hoveredId === hoveredId) {
        return;
      }
      recomputeFocus(hoveredId, state.selectedId);
    },
  };
};

const KiGraphUiStoreContext = createContext<KiGraphUiStore | undefined>(undefined);

const useKiGraphUiStoreContext = (): KiGraphUiStore => {
  const store = useContext(KiGraphUiStoreContext);
  if (store === undefined) {
    throw new Error('Ki graph UI store hooks must be used within KiGraphUiStoreProvider');
  }
  return store;
};

export const useKiGraphUiStore = <T,>(selector: (state: KiGraphUiState) => T): T => {
  const store = useKiGraphUiStoreContext();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
};

export interface KiGraphUiStoreActions {
  readonly setHoveredId: KiGraphUiStore['setHoveredId'];
  readonly setSelectedId: KiGraphUiStore['setSelectedId'];
}

export const useKiGraphUiStoreActions = (): KiGraphUiStoreActions => {
  const store = useKiGraphUiStoreContext();
  return useMemo(
    () => ({
      setHoveredId: store.setHoveredId,
      setSelectedId: store.setSelectedId,
    }),
    [store]
  );
};

export interface KiGraphUiStoreProviderProps {
  readonly edges: readonly KiGraphEdge[];
  readonly selectedId?: string;
  readonly children: React.ReactNode;
}

export const KiGraphUiStoreProvider = ({
  edges,
  selectedId,
  children,
}: KiGraphUiStoreProviderProps) => {
  const [store] = useState(createKiGraphUiStore);

  useEffect(() => {
    store.setEdges(edges);
  }, [edges, store]);

  useEffect(() => {
    store.setSelectedId(selectedId);
  }, [selectedId, store]);

  return <KiGraphUiStoreContext.Provider value={store}>{children}</KiGraphUiStoreContext.Provider>;
};
