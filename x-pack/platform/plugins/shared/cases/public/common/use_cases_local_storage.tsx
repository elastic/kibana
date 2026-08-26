/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useApplication } from './lib/kibana/use_application';

type SetLocalStorageItem<T> = (newItem: T | ((prev: T) => T)) => void;

// Module-level registry so multiple hook instances sharing the same localStorage key
// stay in sync within the same session without requiring a page reload.
type SyncListener = (value: unknown) => void;
const syncListeners = new Map<string, Set<SyncListener>>();

const notifySyncListeners = (key: string, value: unknown, self: SyncListener | null) => {
  const listeners = syncListeners.get(key);
  if (!listeners) return;
  for (const listener of listeners) {
    if (listener !== self) listener(value);
  }
};

export const useCasesLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, SetLocalStorageItem<T>] => {
  const isStorageInitialized = useRef(false);
  const { appId } = useApplication();
  const { owner } = useCasesContext();

  const lsKeyPrefix = owner.length > 0 ? owner.join('.') : appId;
  const lsKey = getLocalStorageKey(key, lsKeyPrefix);

  const [value, setValue] = useState<T>(() => getStorageItem(lsKey, initialValue));

  // Track the latest value in a ref so functional updates compose when several
  // setters run in the same render (e.g. distinct filter fields on one key)
  // without moving the localStorage write into the (impure) state updater.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Ref to this instance's listener so setItem can exclude it from notifications.
  const selfListenerRef = useRef<SyncListener | null>(null);

  // Register a listener so writes from other hook instances sharing the same key
  // propagate back to this instance's React state.
  useEffect(() => {
    const listener: SyncListener = (newValue) => {
      setValue(newValue as T);
      valueRef.current = newValue as T;
    };
    selfListenerRef.current = listener;

    let keyListeners = syncListeners.get(lsKey);
    if (!keyListeners) {
      keyListeners = new Set();
      syncListeners.set(lsKey, keyListeners);
    }
    keyListeners.add(listener);

    return () => {
      syncListeners.get(lsKey)?.delete(listener);
      if (syncListeners.get(lsKey)?.size === 0) {
        syncListeners.delete(lsKey);
      }
      selfListenerRef.current = null;
    };
  }, [lsKey]);

  const setItem = useCallback<SetLocalStorageItem<T>>(
    (newValue) => {
      const resolved =
        typeof newValue === 'function'
          ? (newValue as (previous: T) => T)(valueRef.current)
          : newValue;
      valueRef.current = resolved;
      setValue(resolved);
      saveItemToStorage(lsKey, resolved);
      notifySyncListeners(lsKey, resolved, selfListenerRef.current);
    },
    [lsKey]
  );

  if (!lsKeyPrefix) {
    return [initialValue, setItem];
  }

  if (lsKeyPrefix != null && !isStorageInitialized.current) {
    isStorageInitialized.current = true;
    // Inline the write so we can skip notifySyncListeners: this runs during
    // render, and siblings already read the same value from storage at their
    // own init time. Calling setValue on a sibling during render would trigger
    // the "Cannot update a component while rendering a different component" warning.
    const stored = getStorageItem(lsKey, initialValue);
    valueRef.current = stored;
    setValue(stored);
    saveItemToStorage(lsKey, stored);
  }

  return [value, setItem];
};

const getStorageItem = <T,>(key: string, initialValue: T): T => {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return initialValue;
    }

    return JSON.parse(value);
  } catch (error) {
    // silent errors
    return initialValue;
  }
};

const saveItemToStorage = <T,>(key: string, item: T) => {
  try {
    const value = JSON.stringify(item);
    localStorage.setItem(key, value);
  } catch (error) {
    // silent errors
  }
};

const getLocalStorageKey = (localStorageKey: string, prefix?: string) => {
  return [prefix, localStorageKey].filter(Boolean).join('.');
};
