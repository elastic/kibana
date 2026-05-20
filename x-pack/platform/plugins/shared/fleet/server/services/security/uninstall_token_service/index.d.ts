import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger } from '@kbn/logging';
import { UninstallTokenError } from '../../../../common/errors';
import type { GetUninstallTokensMetadataResponse } from '../../../../common/types/rest_spec/uninstall_token';
import type { UninstallToken } from '../../../../common/types/models/uninstall_token';
export interface UninstallTokenSOAttributes {
    policy_id: string;
    token: string;
    token_plain: string;
    namespaces?: string[];
}
export interface UninstallTokenInvalidError {
    error: UninstallTokenError;
}
export interface UninstallTokenServiceInterface {
    /**
     * Get uninstall token based on its id.
     *
     * @param id
     * @returns uninstall token if found, null if not found
     */
    getToken(id: string): Promise<UninstallToken | null>;
    /**
     * Get uninstall token metadata, optionally filtering for policyID and policy name, with a logical OR relation:
     * every uninstall token is returned with a related agent policy which partially matches either the given policyID or the policy name.
     * The result is paginated.
     *
     * @param policyIdSearchTerm a string for partial matching the policyId
     * @param policyNameSearchTerm a string for partial matching the policy name
     * @param page
     * @param perPage
     * @param excludedPolicyIds
     * @returns Uninstall Tokens Metadata Response
     */
    getTokenMetadata(policyIdSearchTerm?: string, policyNameSearchTerm?: string, page?: number, perPage?: number, excludedPolicyIds?: string[]): Promise<GetUninstallTokensMetadataResponse>;
    /**
     * Get hashed uninstall token for given policy id
     *
     * @param policyId agent policy id
     * @returns hashedToken
     */
    getHashedTokenForPolicyId(policyId: string): Promise<string>;
    /**
     * Get hashed uninstall tokens for given policy ids
     *
     * @param policyIds agent policy ids
     * @returns Record<policyId, hashedToken>
     */
    getHashedTokensForPolicyIds(policyIds?: string[]): Promise<Record<string, string>>;
    /**
     * Get hashed uninstall token for all policies
     *
     * @returns Record<policyId, hashedToken>
     */
    getAllHashedTokens(): Promise<Record<string, string>>;
    /**
     * Generate uninstall token for given policy id
     * Will not create a new token if one already exists for a given policy unless force: true is used
     *
     * @param policyId agent policy id
     * @param force generate a new token even if one already exists
     * @returns hashedToken
     */
    generateTokenForPolicyId(policyId: string, force?: boolean): Promise<void>;
    /**
     * Generate uninstall tokens for given policy ids
     * Will not create a new token if one already exists for a given policy unless force: true is used
     *
     * @param policyIds agent policy ids
     * @param force generate a new token even if one already exists
     * @returns Record<policyId, hashedToken>
     */
    generateTokensForPolicyIds(policyIds: string[], force?: boolean): Promise<void>;
    /**
     * Generate uninstall tokens all policies
     * Will not create a new token if one already exists for a given policy unless force: true is used
     *
     * @param force generate a new token even if one already exists
     * @returns Record<policyId, hashedToken>
     */
    generateTokensForAllPolicies(force?: boolean): Promise<void>;
    /**
     * If encryption is available, checks for any plain text uninstall tokens and encrypts them
     */
    encryptTokens(): Promise<void>;
    /**
     * Check whether the selected policy has a valid uninstall token. Rejects returning promise if not.
     *
     * @param policyId policy Id to check
     */
    checkTokenValidityForPolicy(policyId: string): Promise<UninstallTokenInvalidError | null>;
    /**
     * Check whether all policies have a valid uninstall token. Rejects returning promise if not.
     *
     */
    checkTokenValidityForAllPolicies(): Promise<UninstallTokenInvalidError | null>;
    scoped(spaceId?: string): UninstallTokenServiceInterface;
}
export declare class UninstallTokenService implements UninstallTokenServiceInterface {
    private esoClient;
    private _soClient;
    private isScoped;
    constructor(esoClient: EncryptedSavedObjectsClient, soClient?: SavedObjectsClientContract);
    protected getLogger(...childContextPaths: string[]): Logger;
    scoped(spaceId?: string): UninstallTokenService;
    getToken(id: string): Promise<UninstallToken | null>;
    private prepareSearchString;
    private prepareExactPolicyIdQuery;
    private prepareRegexpQuery;
    private prepareQueryStringQuery;
    private searchPoliciesByName;
    getTokenMetadata(policyIdSearchTerm?: string, policyNameSearchTerm?: string, page?: number, perPage?: number, excludedPolicyIds?: string[]): Promise<GetUninstallTokensMetadataResponse>;
    private getPolicyIdNameDictionary;
    private getDecryptedTokensForPolicyIds;
    private getDecryptedTokenObjectsForPolicyIds;
    private getUninstallTokenVerificationBatchSize;
    private getDecryptedTokenObjects;
    private convertTokenObjectToToken;
    private getTokenObjectsByPolicyIdFilter;
    getHashedTokenForPolicyId(policyId: string): Promise<string>;
    getHashedTokensForPolicyIds(policyIds: string[]): Promise<Record<string, string>>;
    getAllHashedTokens(): Promise<Record<string, string>>;
    generateTokenForPolicyId(policyId: string, force?: boolean): Promise<void>;
    generateTokensForPolicyIds(policyIds: string[], force?: boolean): Promise<void>;
    generateTokensForAllPolicies(force?: boolean): Promise<void>;
    encryptTokens(): Promise<void>;
    private getAllPolicyIds;
    private persistTokens;
    private generateToken;
    private hashToken;
    private get soClient();
    checkTokenValidityForPolicy(policyId: string): Promise<UninstallTokenInvalidError | null>;
    checkTokenValidityForAllPolicies(): Promise<UninstallTokenInvalidError | null>;
    private checkTokenValidityForPolicies;
    private get isEncryptionAvailable();
    private assertCreatedAt;
    private assertToken;
    private assertPolicyId;
}
