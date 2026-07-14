import type { Logger, SecurityServiceStart, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance, TaskUserScope } from '../task';
export type { ApiKeyType } from '../config';
export interface ApiKeySOFields {
    apiKey?: string;
    uiamApiKey?: string;
    userScope: TaskUserScope;
}
/** Optional flags passed to {@link ApiKeyStrategy.grantApiKeys}. */
export interface GrantApiKeysOpts {
    /** When true, grant only the Elasticsearch API key (skip UIAM). */
    onEsKey?: boolean;
    /**
     * When true, clone the caller's API key credentials instead of reusing them directly.
     * See {@link ApiKeyOptions.cloneApiKey}.
     */
    cloneApiKey?: boolean;
}
export interface InvalidationTarget {
    apiKeyId: string;
    uiamApiKey?: string;
}
export interface ApiKeyStrategy {
    readonly shouldGrantUiam: boolean;
    readonly typeToUse: ApiKeyType;
    grantApiKeys(taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart, opts?: GrantApiKeysOpts): Promise<Map<string, ApiKeySOFields>>;
    getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined;
    getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[];
    markForInvalidation(targets: InvalidationTarget[], logger: Logger, savedObjectsClient: SavedObjectsClientContract): Promise<void>;
}
export declare const markApiKeysForInvalidation: (targets: InvalidationTarget[], logger: Logger, savedObjectsClient: SavedObjectsClientContract) => Promise<void>;
