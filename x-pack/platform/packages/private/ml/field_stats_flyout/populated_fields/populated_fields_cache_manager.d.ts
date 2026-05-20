type StringifiedQueryKey = string;
export declare class PopulatedFieldsCacheManager {
    private readonly _expirationDurationMs;
    private _resultsCache;
    private readonly _lastUpdatedTimestamps;
    constructor(_expirationDurationMs?: number);
    private clearOldCacheIfNeeded;
    private clearExpiredCache;
    get(key: StringifiedQueryKey): any;
    set(key: StringifiedQueryKey, value: any): void;
}
export {};
