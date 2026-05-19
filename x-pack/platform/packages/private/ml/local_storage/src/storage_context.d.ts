import React, { type PropsWithChildren } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
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
export declare function isStorageKey<T>(key: unknown, storageKeys: readonly T[]): key is T;
/**
 * React context to hold storage API.
 */
export declare const MlStorageContext: React.Context<StorageAPI>;
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
export declare function StorageContextProvider<K extends TStorageKey, T extends TStorage>({ children, storage, storageKeys, }: PropsWithChildren<StorageContextProviderProps<K>>): React.JSX.Element;
/**
 * Hook for consuming a storage value
 * @param key
 * @param initValue
 */
export declare function useStorage<K extends TStorageKey, T extends TStorageMapped<K>>(key: K, initValue?: T): [
    typeof initValue extends undefined ? T | undefined : Exclude<T, undefined>,
    (value: T) => void
];
export {};
