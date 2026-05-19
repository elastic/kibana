import type { Headers, ISavedObjectsRepository } from '@kbn/core/server';
import type { UsageStats } from './types';
import type { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
interface BaseIncrementOptions {
    headers?: Headers;
}
export type IncrementCopySavedObjectsOptions = BaseIncrementOptions & Pick<CopyOptions, 'createNewCopies' | 'overwrite' | 'compatibilityMode'>;
export type IncrementResolveCopySavedObjectsErrorsOptions = BaseIncrementOptions & Pick<ResolveConflictsOptions, 'createNewCopies' | 'compatibilityMode'>;
export declare const COPY_STATS_PREFIX = "apiCalls.copySavedObjects";
export declare const RESOLVE_COPY_STATS_PREFIX = "apiCalls.resolveCopySavedObjectsErrors";
export declare const DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX = "apiCalls.disableLegacyUrlAliases";
export declare class UsageStatsClient {
    private readonly debugLogger;
    private readonly repositoryPromise;
    constructor(debugLogger: (message: string) => void, repositoryPromise: Promise<ISavedObjectsRepository>);
    getUsageStats(): Promise<UsageStats>;
    incrementCopySavedObjects({ headers, createNewCopies, overwrite, compatibilityMode, }: IncrementCopySavedObjectsOptions): Promise<void>;
    incrementResolveCopySavedObjectsErrors({ headers, createNewCopies, compatibilityMode, }: IncrementResolveCopySavedObjectsErrorsOptions): Promise<void>;
    incrementDisableLegacyUrlAliases(): Promise<void>;
    private updateUsageStats;
}
export {};
