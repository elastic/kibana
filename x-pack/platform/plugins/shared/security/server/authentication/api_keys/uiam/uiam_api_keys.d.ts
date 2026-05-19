import type { KibanaRequest, Logger } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { ConvertUiamAPIKeysResponse, GrantAPIKeyResult, GrantUiamAPIKeyParams, InvalidateAPIKeyResult, InvalidateUiamAPIKeyParams, UiamAPIKeysType } from '@kbn/security-plugin-types-server';
import type { SecurityLicense } from '../../../../common';
import type { UiamServicePublic } from '../../../uiam';
/**
 * Options required to construct a UiamAPIKeys instance.
 */
export interface UiamAPIKeysOptions {
    logger: Logger;
    license: SecurityLicense;
    uiam: UiamServicePublic;
}
/**
 * Class responsible for managing UIAM-specific API key operations.
 * This class handles API key grants and invalidations through the UIAM service.
 */
export declare class UiamAPIKeys implements UiamAPIKeysType {
    private readonly logger;
    private readonly license;
    private readonly uiam;
    constructor({ logger, license, uiam }: UiamAPIKeysOptions);
    /**
     * Grants an API key via the UIAM service.
     *
     * @param request The Kibana request instance containing the authorization header.
     * @param params The parameters for creating the API key (name and optional expiration).
     * @returns A promise that resolves to a GrantAPIKeyResult object containing the API key details, or null if the license is not enabled.
     * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
     */
    grant(request: KibanaRequest, params: GrantUiamAPIKeyParams): Promise<GrantAPIKeyResult | null>;
    /**
     * Invalidates an API key via the UIAM service.
     *
     * @param request The Kibana request instance containing the authorization header.
     * @param params The parameters containing the ID of the API key to invalidate.
     * @returns A promise that resolves to an InvalidateAPIKeyResult object indicating the result of the operation, or null if the license is not enabled.
     * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
     */
    invalidate(request: KibanaRequest, params: InvalidateUiamAPIKeyParams): Promise<InvalidateAPIKeyResult | null>;
    /**
     * Converts Elasticsearch API keys into UIAM API keys.
     *
     * @param keys Array containing the keys to convert.
     * @returns A promise that resolves to a response containing per-key success/failure results, or null if the license is not enabled.
     */
    convert(keys: string[]): Promise<ConvertUiamAPIKeysResponse | null>;
    /**
     * Extracts and returns the authorization header from the request.
     *
     * @param request The Kibana request instance.
     * @returns The HTTP authorization header extracted from the request.
     * @throws {Error} If the request does not contain an authorization header.
     */
    static getAuthorizationHeader(request: KibanaRequest): HTTPAuthorizationHeader;
}
