/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Discreet, persisted toggle for the Cloud provider hierarchy.
 *
 * When enabled (the default), the Cloud pages group entities by
 * provider (AWS / GCP / Azure) and then by service (EC2, Lambda, …),
 * matching the nested left-nav. When disabled, the Cloud page falls back
 * to the original flat "group by type" layout — so the two experiences
 * can be compared side by side without a rebuild.
 *
 * Backed by `localStorage` (same approach as `useEntitiesViewMode` /
 * `useCategoryTab`) and kept in sync across mounted instances via a
 * custom event, so flipping the switch on the toolbar updates every
 * Cloud surface on the page at once.
 */

const STORAGE_KEY = 'entityCentricLab.cloudHierarchy.v1';
const CHANGE_EVENT = 'entity-centric-lab:cloud-hierarchy-changed';

const readEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Default ON so the new hierarchy is visible out of the box; only an
    // explicit "false" opts back into the flat legacy layout.
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
};

export const useCloudHierarchyEnabled = (): [boolean, (next: boolean) => void] => {
  const [enabled, setEnabledState] = useState<boolean>(() => readEnabled());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const listener = () => setEnabledState(readEnabled());
    window.addEventListener(CHANGE_EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(CHANGE_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Storage blocked — keep the in-memory value for this session.
    }
  }, []);

  return [enabled, setEnabled];
};
