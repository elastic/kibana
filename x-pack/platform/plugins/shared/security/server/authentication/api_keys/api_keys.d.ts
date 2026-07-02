import type { BuildFlavor } from '@kbn/config';
import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { CloneAPIKeyParams, CloneAPIKeyResult, CreateAPIKeyParams, CreateAPIKeyResult, CreateRestAPIKeyParams, CreateRestAPIKeyWithKibanaPrivilegesParams, GrantAPIKeyResult, InvalidateAPIKeyResult, InvalidateAPIKeysParams, NativeAPIKeysType, ValidateAPIKeyParams } from '@kbn/security-plugin-types-server';
import type { SecurityLicense } from '../../../common';
import type { UpdateAPIKeyParams, UpdateAPIKeyResult } from '../../routes/api_keys';
import { type UiamServicePublic } from '../../uiam';
export type { UpdateAPIKeyParams, UpdateAPIKeyResult };
/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface ConstructorOptions {
    logger: Logger;
    clusterClient: IClusterClient;
    license: SecurityLicense;
    applicationName: string;
    kibanaFeatures: KibanaFeature[];
    buildFlavor?: BuildFlavor;
    uiam?: UiamServicePublic;
}
/**
 * Class responsible for managing Elasticsearch API keys.
 */
export declare class APIKeys implements NativeAPIKeysType {
    private readonly logger;
    private readonly clusterClient;
    private readonly license;
    private readonly applicationName;
    private readonly kibanaFeatures;
    private readonly buildFlavor?;
    private readonly uiam?;
    constructor({ logger, clusterClient, license, applicationName, kibanaFeatures, buildFlavor, uiam, }: ConstructorOptions);
    /**
     * Determines if API Keys are enabled in Elasticsearch.
     */
    areAPIKeysEnabled(): Promise<boolean>;
    /**
     * Determines if cross-cluster API Keys are enabled in Elasticsearch.
     */
    areCrossClusterAPIKeysEnabled(): Promise<boolean>;
    /**
     * Tries to create an API key for the current user.
     *
     * Returns newly created API key or `null` if API keys are disabled.
     *
     * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for cross-cluster API keys.
     *
     * @param request Request instance.
     * @param createParams The params to create an API key
     */
    create(request: KibanaRequest, createParams: CreateAPIKeyParams): Promise<CreateAPIKeyResult | null>;
    /**
     * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
     *
     * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
     *
     * User needs `manage_api_key` privilege to update REST API keys and `manage_security` for cross-cluster API keys.
     *
     * @param request Request instance.
     * @param updateParams The params to edit an API key
     */
    update(request: KibanaRequest, updateParams: UpdateAPIKeyParams): Promise<UpdateAPIKeyResult | null>;
    /**
     * Tries to grant an API key for the current user.
     * @param request Request instance.
     * @param createParams Create operation parameters.
     */
    grantAsInternalUser(request: KibanaRequest, createParams: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams): Promise<GrantAPIKeyResult | null>;
    /**
     * Clones an existing API key using the internal user. Extracts the source key credential
     * from the request's Authorization header and calls the ES clone endpoint to create a new
     * independent key with the same role descriptors and no expiration.
     */
    cloneAsInternalUser(request: KibanaRequest, cloneParams: CloneAPIKeyParams): Promise<CloneAPIKeyResult | null>;
    /**
     * Tries to invalidate an API keys.
     * @param request Request instance.
     * @param params The params to invalidate an API keys.
     */
    invalidate(request: KibanaRequest, params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
    /**
     * Tries to invalidate the API keys by using the internal user.
     * @param params The params to invalidate the API keys.
     */
    invalidateAsInternalUser(params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
    /**
     * Tries to validate an API key.
     * @param apiKeyPrams ValidateAPIKeyParams.
     */
    validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean>;
    private doesErrorIndicateAPIKeysAreDisabled;
    private doesErrorIndicateCrossClusterAPIKeysAreDisabled;
    private getGrantParams;
    private parseRoleDescriptorsWithKibanaPrivileges;
}
export declare class CreateApiKeyValidationError extends Error {
    constructor(message: string);
}
export declare class UpdateApiKeyValidationError extends Error {
    constructor(message: string);
}
