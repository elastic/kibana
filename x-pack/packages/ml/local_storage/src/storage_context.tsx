/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useContext,
} from 'react';
import { omit } from 'lodash';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';

/**
 * StorageDefinition is a dictionary with `string` based keys.
 */
interface StorageDefinition {
  [key: string]: unknown;
}

/**
 * TStorage, a partial `StorageDefinition` or `null`.
 */
type TStorage = Partial<StorageDefinition> | null;
/**
 * TStorageKey, keys of StorageDefintion.
 */
type TStorageKey = keyof Exclude<TStorage, null>;
/**
 * TStorageMapped, mapping of TStorage with TStorageKey.
 */
type TStorageMapped<T extends TStorageKey> = T extends string ? unknown : null;

/**
 * StorageAPI definition of store TStorage with accessors.
 */
interface StorageAPI {
  value: TStorage;
  setValue: <K extends TStorageKey, T extends TStorageMapped<K>>(key: K, value: T) => void;
  removeValue: <K extends TStorageKey>(key: K) => void;
}

/**
 * Type guard to check if a supplied `key` is in `storageKey`.
 *
 * @param key
 * @param storageKeys
 * @returns boolean
 */
export function isStorageKey<T>(key: unknown, storageKeys: readonly T[]): key is T {
  return storageKeys.includes(key as T);
}

/**
 * React context to hold storage API.
 */
export const MlStorageContext = React.createContext<StorageAPI>({
  value: null,
  setValue() {
    throw new Error('MlStorageContext set method is not implemented');
  },
  removeValue() {
    throw new Error('MlStorageContext remove method is not implemented');
  },
});

/**
 * Props for StorageContextProvider
 */
interface StorageContextProviderProps<K extends TStorageKey> {
  storage: Storage;
  storageKeys: readonly K[];
}

/**
 * Provider to manage context for the `useStorage` hook.
 */
export function StorageContextProvider<K extends TStorageKey, T extends TStorage>({
  children,
  storage,
  storageKeys,
}: PropsWithChildren<StorageContextProviderProps<K>>) {
  const initialValue = useMemo(() => {
    return storageKeys.reduce((acc, curr) => {
      acc[curr as K] = storage.get(curr as string);
      return acc;
    }, {} as Exclude<T, null>);
  }, [storage, storageKeys]);

  const [state, setState] = useState<T>(initialValue);

  const setStorageValue = useCallback(
    <TM extends TStorageMapped<K>>(key: K, value: TM) => {
      storage.set(key as string, value);

      setState((prevState) => ({
        ...prevState,
        [key]: value,
      }));
    },
    [storage]
  );

  const removeStorageValue = useCallback(
    (key: K) => {
      storage.remove(key as string);
      setState((prevState) => omit(prevState, key) as T);
    },
    [storage]
  );

  useEffect(
    function updateStorageOnExternalChange() {
      const eventListener = (event: StorageEvent) => {
        if (!isStorageKey(event.key, storageKeys)) return;

        if (isDefined(event.newValue)) {
          setState((prev) => {
            return {
              ...prev,
              [event.key as K]:
                typeof event.newValue === 'string' ? JSON.parse(event.newValue) : event.newValue,
            };
          });
        } else {
          setState((prev) => omit(prev, event.key as K) as T);
        }
      };

      /**
       * This event listener is only invoked when
       * the change happens in another browser's tab.
       */
      window.addEventListener('storage', eventListener);

      return () => {
        window.removeEventListener('storage', eventListener);
      };
    },
    [storageKeys]
  );

  const value = useMemo(() => {
    return {
      value: state,
      setValue: setStorageValue,
      removeValue: removeStorageValue,
    } as StorageAPI;
  }, [state, setStorageValue, removeStorageValue]);

  return <MlStorageContext.Provider value={value}>{children}</MlStorageContext.Provider>;
}

/**
 * Hook for consuming a storage value
 * @param key
 * @param initValue
 */
export function useStorage<K extends TStorageKey, T extends TStorageMapped<K>>(
  key: K,
  initValue?: T
): [
  typeof initValue extends undefined ? T | undefined : Exclude<T, undefined>,
  (value: T) => void
] {
  const { value, setValue, removeValue } = useContext(MlStorageContext);

  const resultValue = useMemo(() => {
    return (value?.[key] ?? initValue) as typeof initValue extends undefined
      ? T | undefined
      : Exclude<T, undefined>;
  }, [value, key, initValue]);

  const setVal = useCallback(
    (v: T) => {
      if (isDefined(v)) {
        setValue(key, v);
      } else {
        removeValue(key);
      }
    },
    [setValue, removeValue, key]
  );

  return [resultValue, setVal];
}
