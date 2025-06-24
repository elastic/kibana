/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef } from 'react';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useApplication } from './lib/kibana/use_application';

export const useCasesLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, (newItem: T) => void] => {
  const isStorageInitialized = useRef(false);
  const { appId } = useApplication();
  const { owner } = useCasesContext();

  const lsKeyPrefix = owner.length > 0 ? owner.join('.') : appId;
  const lsKey = getLocalStorageKey(key, lsKeyPrefix);

  const [value, setValue] = useState<T>(() => getStorageItem(lsKey, initialValue));

  const setItem = useCallback(
    (newValue: T) => {
      setValue(newValue);
      saveItemToStorage(lsKey, newValue);
    },
    [lsKey]
  );

  if (!lsKeyPrefix) {
    return [initialValue, setItem];
  }

  if (lsKeyPrefix != null && !isStorageInitialized.current) {
    isStorageInitialized.current = true;
    setItem(getStorageItem(lsKey, initialValue));
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
