/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  // This is necessary to fix a race condition issue.
  // It guarantees that the latest value will be always returned after the value is updated
  const [storageUpdate, setStorageUpdate] = useState(0);

  const item = useMemo(() => {
    return getFromStorage(key, defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storageUpdate, defaultValue]);

  const saveToStorage = useCallback(
    (value: T) => {
      if (value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
        setStorageUpdate(storageUpdate + 1);
      }
    },
    [key, storageUpdate]
  );

  useEffect(() => {
    function onUpdate(event: StorageEvent) {
      if (event.key === key) {
        setStorageUpdate(storageUpdate + 1);
      }
    }
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
    };
  }, [key, setStorageUpdate, storageUpdate]);

  return useMemo(() => [item, saveToStorage] as const, [item, saveToStorage]);
}

function getFromStorage<T>(keyName: string, defaultValue: T) {
  const storedItem = window.localStorage.getItem(keyName);

  if (storedItem !== null) {
    try {
      return JSON.parse(storedItem) as T;
    } catch (err) {
      window.localStorage.removeItem(keyName);
      // eslint-disable-next-line no-console
      console.log(`Unable to decode: ${keyName}`);
    }
  }
  return defaultValue;
}
