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

import { isDefined } from './is_defined';

interface StorageDefinition {
  [key: string]: unknown;
}

interface StorageAPI<TStorageDefinition extends StorageDefinition> {
  value: Partial<TStorageDefinition> | null;
  setValue: (
    key: Extract<keyof TStorageDefinition, string>,
    value: TStorageDefinition[keyof TStorageDefinition]
  ) => void;
  removeValue: (key: Extract<keyof TStorageDefinition, string>) => void;
}

export function isStorageKey<T>(key: unknown, storageKeys: T[]): key is T {
  return storageKeys.includes(key as T);
}

export const MlStorageContext = React.createContext<StorageAPI<StorageDefinition>>({
  value: null,
  setValue() {
    throw new Error('MlStorageContext set method is not implemented');
  },
  removeValue() {
    throw new Error('MlStorageContext remove method is not implemented');
  },
});

interface MlStorageContextProviderProps<
  TStorageDefinition extends StorageDefinition = {},
  TStorage extends Partial<TStorageDefinition> | null = null
> {
  storage: Storage;
  storageKeys: Array<keyof Exclude<TStorage, null>>;
}

export function MlStorageContextProvider<TStorageDefinition extends StorageDefinition = {}>({
  children,
  storage,
  storageKeys,
}: PropsWithChildren<MlStorageContextProviderProps<TStorageDefinition>>) {
  const initialValue = useMemo(() => {
    return storageKeys.reduce((acc, curr) => {
      acc[curr as keyof TStorageDefinition] = storage.get(curr as string);
      return acc;
    }, {} as TStorageDefinition);
  }, [storage, storageKeys]);

  const [state, setState] = useState<Partial<TStorageDefinition>>(initialValue);

  const setStorageValue: StorageAPI<TStorageDefinition>['setValue'] = useCallback(
    (key: keyof TStorageDefinition, value: TStorageDefinition[keyof TStorageDefinition]) => {
      storage.set(key as string, value);

      setState(
        (prevState) =>
          ({
            ...prevState,
            [key]: value,
          } as Partial<TStorageDefinition>)
      );
    },
    [storage]
  );

  const removeStorageValue: StorageAPI<TStorageDefinition>['removeValue'] = useCallback(
    (key: keyof TStorageDefinition) => {
      storage.remove(key as string);
      setState((prevState) =>
        prevState === null ? prevState : (omit(prevState, key) as TStorageDefinition)
      );
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
              [event.key as keyof TStorageDefinition]:
                typeof event.newValue === 'string' ? JSON.parse(event.newValue) : event.newValue,
            };
          });
        } else {
          setState((prev) => {
            return omit(prev, event.key as keyof TStorageDefinition) as TStorageDefinition;
          });
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

  const value: StorageAPI<TStorageDefinition> = useMemo(() => {
    return {
      value: state as StorageAPI<TStorageDefinition>['value'],
      setValue: setStorageValue,
      removeValue: removeStorageValue,
    };
  }, [state, setStorageValue, removeStorageValue]);

  return <MlStorageContext.Provider value={value}>{children}</MlStorageContext.Provider>;
}

/**
 * Hook for consuming a storage value
 * @param key
 * @param initValue
 */
export function useStorage<TStorageDefinition extends StorageDefinition>(
  key: keyof TStorageDefinition,
  initValue?: TStorageDefinition[keyof TStorageDefinition] | null
): [
  TStorageDefinition[keyof TStorageDefinition] | null | undefined,
  (value: TStorageDefinition[keyof TStorageDefinition]) => void
] {
  const { value, setValue, removeValue } = useContext(MlStorageContext);

  const resultValue = useMemo(() => {
    return value?.[key] ?? initValue;
  }, [value, key, initValue]);

  const setVal = useCallback(
    (v: TStorageDefinition[keyof TStorageDefinition]) => {
      if (isDefined(v)) {
        setValue(key, v as never);
      } else {
        removeValue(key);
      }
    },
    [setValue, removeValue, key]
  );

  return [resultValue, setVal];
}
