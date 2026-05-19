import type { Logger, SecurityServiceStart, IBasePath, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import type { ApiKeySOFields, ApiKeyStrategy, GrantApiKeysOpts, InvalidationTarget } from './api_key_strategy';
export declare class EsAndUiamApiKeyStrategy implements ApiKeyStrategy {
    readonly shouldGrantUiam = true;
    readonly typeToUse: ApiKeyType;
    private readonly security;
    private readonly logger;
    constructor(apiKeyType: ApiKeyType, security: SecurityServiceStart, logger: Logger);
    grantApiKeys(taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart, basePath: IBasePath, opts?: GrantApiKeysOpts): Promise<Map<string, ApiKeySOFields>>;
    private grantUiamApiKeys;
    getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined;
    getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[];
    markForInvalidation(targets: InvalidationTarget[], logger: Logger, savedObjectsClient: SavedObjectsClientContract): Promise<void>;
}
