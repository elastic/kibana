import { LRUCache } from 'lru-cache';
export interface IHashedCache<KeyType, ValueType> {
    get(key: KeyType): ValueType | undefined;
    set(key: KeyType, value: ValueType): boolean;
    has(key: KeyType): boolean;
    reset(): void;
}
export declare class HashedCache<KeyType extends unknown, ValueType extends {}> {
    private cache;
    constructor(options?: LRUCache.Options<string, ValueType, unknown>);
    get(key: KeyType): ValueType | undefined;
    set(key: KeyType, value: ValueType): LRUCache<string, ValueType, unknown>;
    has(key: KeyType): boolean;
    reset(): void;
}
