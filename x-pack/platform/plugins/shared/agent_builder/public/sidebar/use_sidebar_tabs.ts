/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

const TABS_STORAGE_KEY = 'agentBuilder.sidebar.tabs';
export const TAB_SESSION_PREFIX = 'sidebar-tab-';

export interface SidebarTab {
  id: string;
  title: string;
  /** True only on first mount — causes the conversation to start fresh */
  isNew: boolean;
  /** True when the agent finished responding while this tab was in the background */
  hasUnread: boolean;
  /** True while the agent is generating a response */
  isLoading: boolean;
}

interface PersistedState {
  tabs: Array<{ id: string; title: string }>;
  activeTabId: string;
}

const generateTabId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const getSessionTag = (tabId: string) => `${TAB_SESSION_PREFIX}${tabId}`;

const readPersisted = (): PersistedState | null => {
  try {
    const stored = localStorage.getItem(TABS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedState;
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
};

const writePersisted = (state: PersistedState): void => {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const buildInitialTabs = (): { tabs: SidebarTab[]; activeTabId: string } => {
  const persisted = readPersisted();
  if (persisted) {
    return {
      // Restored tabs are not "new" — they reload their last conversation via sessionTag
      tabs: persisted.tabs.map((t) => ({ ...t, isNew: false, hasUnread: false, isLoading: false })),
      activeTabId: persisted.activeTabId,
    };
  }
  const id = generateTabId();
  return {
    tabs: [{ id, title: 'New Chat', isNew: true, hasUnread: false, isLoading: false }],
    activeTabId: id,
  };
};

export interface UseSidebarTabsReturn {
  tabs: SidebarTab[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  markTabDone: (id: string) => void;
  setTabLoading: (id: string, isLoading: boolean) => void;
}

export const useSidebarTabs = (): UseSidebarTabsReturn => {
  const [{ tabs, activeTabId }, setTabsState] = useState(buildInitialTabs);

  const persist = useCallback((nextTabs: SidebarTab[], nextActiveId: string) => {
    writePersisted({
      tabs: nextTabs.map(({ id, title }) => ({ id, title })),
      activeTabId: nextActiveId,
    });
  }, []);

  const addTab = useCallback(() => {
    const id = generateTabId();
    const newTab: SidebarTab = { id, title: 'New Chat', isNew: true, hasUnread: false, isLoading: false };
    setTabsState((prev) => {
      const next = { tabs: [...prev.tabs, newTab], activeTabId: id };
      persist(next.tabs, next.activeTabId);
      return next;
    });
  }, [persist]);

  const closeTab = useCallback(
    (id: string) => {
    setTabsState((prev) => {
      // Always create with hasUnread: false; only mark unread later when in the background
      if (prev.tabs.length <= 1) return prev;
      const idx = prev.tabs.findIndex((t) => t.id === id);
        const nextTabs = prev.tabs.filter((t) => t.id !== id);
        const nextActiveId =
          prev.activeTabId === id
            ? (nextTabs[Math.min(idx, nextTabs.length - 1)]?.id ?? nextTabs[0].id)
            : prev.activeTabId;
        persist(nextTabs, nextActiveId);
        return { tabs: nextTabs, activeTabId: nextActiveId };
      });
    },
    [persist]
  );

  const setActiveTab = useCallback(
    (id: string) => {
      setTabsState((prev) => {
        if (prev.activeTabId === id) return prev;
        // Clear the unread indicator when the user focuses the tab
        const nextTabs = prev.tabs.map((t) => (t.id === id ? { ...t, hasUnread: false } : t));
        persist(nextTabs, id);
        return { tabs: nextTabs, activeTabId: id };
      });
    },
    [persist]
  );

  const markTabDone = useCallback((id: string) => {
    setTabsState((prev) => {
      // Only set unread on background tabs — active tab user is already watching
      if (prev.activeTabId === id) return prev;
      if (prev.tabs.find((t) => t.id === id)?.hasUnread) return prev;
      const nextTabs = prev.tabs.map((t) => (t.id === id ? { ...t, hasUnread: true } : t));
      // Don't persist hasUnread — it's ephemeral (clears on reload)
      return { ...prev, tabs: nextTabs };
    });
  }, []);

  const updateTabTitle = useCallback(
    (id: string, title: string) => {
      setTabsState((prev) => {
        const nextTabs = prev.tabs.map((t) => (t.id === id ? { ...t, title } : t));
        persist(nextTabs, prev.activeTabId);
        return { ...prev, tabs: nextTabs };
      });
    },
    [persist]
  );

  const setTabLoading = useCallback((id: string, loading: boolean) => {
    setTabsState((prev) => {
      if (prev.tabs.find((t) => t.id === id)?.isLoading === loading) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === id ? { ...t, isLoading: loading } : t)),
      };
    });
  }, []);

  return { tabs, activeTabId, addTab, closeTab, setActiveTab, updateTabTitle, markTabDone, setTabLoading };
};
