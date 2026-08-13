/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef } from 'react';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useApplication } from './lib/kibana/use_application';

type SetLocalStorageItem<T> = (newItem: T | ((prev: T) => T)) => void;

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

  const setItem = useCallback<SetLocalStorageItem<T>>(
    (newValue) => {
      const resolved =
        typeof newValue === 'function'
          ? (newValue as (previous: T) => T)(valueRef.current)
          : newValue;
      valueRef.current = resolved;
      setValue(resolved);
      saveItemToStorage(lsKey, resolved);
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
