import type { AuthenticatedUser, KibanaRequest, ElasticsearchClient, SavedObjectsClientContract, Logger, RequestHandlerContext, SavedObjectsFindResponse, SavedObjectsFindResult } from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { PostDeletePackagePoliciesResponse, UpgradePackagePolicyResponse, PackagePolicyInput, NewPackagePolicyInput, PackagePolicyInputStream, PackageInfo, ListWithKuery, ListResult, UpgradePackagePolicyDryRunResponseItem, RegistryDataStream, DeletePackagePoliciesResponse, AgentPolicy, PackagePolicyAssetsMap, PreconfiguredInputs, CloudConnector, ArchiveEntry } from '../../common/types';
import type { NewPackagePolicy, UpdatePackagePolicy, PackagePolicy, PackagePolicySOAttributes, DryRunPackagePolicy, AssetsMap } from '../types';
import type { ExternalCallback } from '..';
import type { FleetAuthzRouteConfig } from './security';
import type { PackagePolicyClient, PackagePolicyClientBulkUpdateOptions, PackagePolicyClientDeleteOptions, PackagePolicyClientFetchAllItemsOptions, PackagePolicyClientFindAllForAgentPolicyOptions, PackagePolicyClientGetByIdsOptions, PackagePolicyClientGetOptions, PackagePolicyClientListIdsOptions, PackagePolicyClientRollbackOptions, PackagePolicyService, RollbackResult, RunExternalCallbacksPackagePolicyArgument, RunExternalCallbacksPackagePolicyResponse } from './package_policy_service';
import type { PackagePolicyClientFetchAllItemIdsOptions } from './package_policy_service';
export type InputsOverride = Partial<NewPackagePolicyInput> & {
    vars?: Array<NewPackagePolicyInput['vars'] & {
        name: string;
    }>;
};
export declare function getPackagePolicySavedObjectType(): Promise<"ingest-package-policies" | "fleet-package-policies">;
/**
 * Returns the union of all agent version keys stored in inputs_for_versions across every
 * package policy that belongs to the given agent policy. Used by deployPolicies to ensure
 * non-default agent versions (e.g. 9.1 from an enrolled agent) get updated .fleet-policies
 * documents when the agent policy changes, not just the common default versions.
 */
export declare function getCompiledVersionsForAgentPolicy(soClient: SavedObjectsClientContract, agentPolicyId: string): Promise<string[]>;
/**
 * Returns a kuery string that excludes package policies with latest_revision:false,
 * optionally AND-ing with an additional kuery clause.
 */
export declare function buildCurrentRevisionFilter(savedObjectType: string, kuery?: string): string;
export declare function _normalizePackagePolicyKuery(savedObjectType: string, kuery: string): string;
declare class PackagePolicyClientImpl implements PackagePolicyClient {
    protected getLogger(...childContextPaths: string[]): Logger;
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicy: NewPackagePolicy, options?: {
        spaceId?: string;
        id?: string;
        user?: AuthenticatedUser;
        bumpRevision?: boolean;
        force?: boolean;
        skipEnsureInstalled?: boolean;
        skipUniqueNameVerification?: boolean;
        overwrite?: boolean;
        packageInfo?: PackageInfo;
    }, context?: RequestHandlerContext, request?: KibanaRequest): Promise<PackagePolicy>;
    compilePackagePolicyForVersions(soClient: SavedObjectsClientContract, packageInfo: PackageInfo, assetsMap: PackagePolicyAssetsMap, packagePolicy: PackagePolicy, agentVersions?: string[]): Promise<void>;
    private bumpAgentPoliciesRevision;
    keepPolicyIdInSync(packagePolicy: NewPackagePolicy): void;
    bulkCreate(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicies: NewPackagePolicyWithId[], options?: {
        user?: AuthenticatedUser;
        bumpRevision?: boolean;
        force?: true;
        asyncDeploy?: boolean;
    }, request?: KibanaRequest): Promise<{
        created: PackagePolicy[];
        failed: Array<{
            packagePolicy: NewPackagePolicy;
            error?: Error | SavedObjectError;
        }>;
    }>;
    /** Purpose of this function is to take a package policy and compile the inputs
     This is primarily used by the Synthetics UI to display the inputs which are passed to agent
     Purpose is to debug the inputs which are passed to the agent and also compared them to the config
     which is passed to public service locations */
    inspect(soClient: SavedObjectsClientContract, packagePolicy: NewPackagePolicyWithId): Promise<NewPackagePolicy>;
    get(soClient: SavedObjectsClientContract, id: string, options?: PackagePolicyClientGetOptions): Promise<PackagePolicy | null>;
    findAllForAgentPolicy(soClient: SavedObjectsClientContract, agentPolicyId: string, options?: PackagePolicyClientFindAllForAgentPolicyOptions): Promise<PackagePolicy[]>;
    getByIDs(soClient: SavedObjectsClientContract, ids: string[], options?: PackagePolicyClientGetByIdsOptions): Promise<PackagePolicy[]>;
    list(soClient: SavedObjectsClientContract, options: ListWithKuery & {
        spaceId?: string;
    }): Promise<ListResult<PackagePolicy>>;
    listIds(soClient: SavedObjectsClientContract, options: PackagePolicyClientListIdsOptions): Promise<ListResult<string>>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, packagePolicyUpdate: UpdatePackagePolicy, options?: {
        user?: AuthenticatedUser;
        force?: boolean;
        skipUniqueNameVerification?: boolean;
        bumpRevision?: boolean;
    }): Promise<PackagePolicy>;
    bulkUpdate(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicyUpdates: Array<NewPackagePolicy & {
        version?: string;
        id: string;
    }>, options?: PackagePolicyClientBulkUpdateOptions): Promise<{
        updatedPolicies: PackagePolicy[] | null;
        failedPolicies: Array<{
            packagePolicy: NewPackagePolicyWithId;
            error: Error | SavedObjectError;
        }>;
    }>;
    delete(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, ids: string[], options?: PackagePolicyClientDeleteOptions, context?: RequestHandlerContext, request?: KibanaRequest): Promise<PostDeletePackagePoliciesResponse>;
    bulkUpgrade(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, ids: string[], options?: {
        user?: AuthenticatedUser;
        force?: boolean;
    }, pkgVersion?: string): Promise<UpgradePackagePolicyResponse>;
    upgrade(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, options?: {
        user?: AuthenticatedUser;
        force?: boolean;
    }, packagePolicy?: PackagePolicy, pkgVersion?: string): Promise<UpgradePackagePolicyResponse>;
    getUpgradeDryRunDiff(soClient: SavedObjectsClientContract, id: string, packagePolicy?: PackagePolicy, pkgVersion?: string): Promise<UpgradePackagePolicyDryRunResponseItem>;
    enrichPolicyWithDefaultsFromPackage(soClient: SavedObjectsClientContract, newPolicy: NewPackagePolicy): Promise<NewPackagePolicy>;
    private buildPackagePolicyFromPackageWithVersion;
    buildPackagePolicyFromPackage(soClient: SavedObjectsClientContract, pkgName: string, options?: {
        logger?: Logger;
        installMissingPackage?: boolean;
    }): Promise<NewPackagePolicy | undefined>;
    runExternalCallbacks<A extends ExternalCallback[0]>(externalCallbackType: A, packagePolicy: RunExternalCallbacksPackagePolicyArgument<A>, soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, context?: RequestHandlerContext, request?: KibanaRequest): Promise<RunExternalCallbacksPackagePolicyResponse<A>>;
    runPostDeleteExternalCallbacks(deletedPackagePolicies: PostDeletePackagePoliciesResponse, soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, context?: RequestHandlerContext, request?: KibanaRequest): Promise<void>;
    runDeleteExternalCallbacks(deletedPackagePolices: DeletePackagePoliciesResponse, soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<void>;
    removeOutputFromAll(esClient: ElasticsearchClient, outputId: string, options?: {
        force?: boolean;
    }): Promise<void>;
    fetchAllItemIds(soClient: SavedObjectsClientContract, { perPage, kuery, spaceIds }?: PackagePolicyClientFetchAllItemIdsOptions): Promise<AsyncIterable<string[]>>;
    fetchAllItems(soClient: SavedObjectsClientContract, options?: PackagePolicyClientFetchAllItemsOptions): Promise<AsyncIterable<PackagePolicy[]>>;
    getPackagePolicySavedObjects(soClient: SavedObjectsClientContract, options?: PackagePolicyClientRollbackOptions): Promise<SavedObjectsFindResponse<PackagePolicySOAttributes, unknown>>;
    rollback(soClient: SavedObjectsClientContract, packagePolicies: Array<SavedObjectsFindResult<PackagePolicySOAttributes>>, previousVersion: string): Promise<RollbackResult>;
    restoreRollback(soClient: SavedObjectsClientContract, rollbackResult: RollbackResult): Promise<void>;
    cleanupRollbackSavedObjects(soClient: SavedObjectsClientContract, rollbackResult: RollbackResult): Promise<void>;
    private deleteRollbackSavedObjects;
    bumpAgentPolicyRevisionAfterRollback(soClient: SavedObjectsClientContract, rollbackResult: RollbackResult): Promise<void>;
    createCloudConnectorForPackagePolicy(soClient: SavedObjectsClientContract, enrichedPackagePolicy: NewPackagePolicy, agentPolicy: AgentPolicy, packageInfo: PackageInfo): Promise<CloudConnector | undefined>;
}
export declare class PackagePolicyServiceImpl extends PackagePolicyClientImpl implements PackagePolicyService {
    asScoped(request: KibanaRequest): PackagePolicyClient;
    get asInternalUser(): PackagePolicyClientWithAuthz;
}
declare class PackagePolicyClientWithAuthz extends PackagePolicyClientImpl {
    #private;
    private readonly preflightCheck?;
    constructor(preflightCheck?: ((fleetAuthzConfig: FleetAuthzRouteConfig) => void | Promise<void>) | undefined);
    bulkCreate(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicies: NewPackagePolicyWithId[], options?: {
        user?: AuthenticatedUser | undefined;
        bumpRevision?: boolean | undefined;
        force?: true | undefined;
        asyncDeploy?: boolean;
    } | undefined): Promise<{
        created: PackagePolicy[];
        failed: Array<{
            packagePolicy: NewPackagePolicy;
            error?: Error | SavedObjectError;
        }>;
    }>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, packagePolicyUpdate: UpdatePackagePolicy, options?: {
        user?: AuthenticatedUser | undefined;
        force?: boolean | undefined;
        skipUniqueNameVerification?: boolean | undefined;
    } | undefined): Promise<PackagePolicy>;
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicy: NewPackagePolicy, options?: {
        spaceId?: string;
        id?: string;
        user?: AuthenticatedUser;
        bumpRevision?: boolean;
        force?: boolean;
        skipEnsureInstalled?: boolean;
        skipUniqueNameVerification?: boolean;
        overwrite?: boolean;
        packageInfo?: PackageInfo;
    }, context?: RequestHandlerContext, request?: KibanaRequest): Promise<PackagePolicy>;
}
export declare function _compilePackagePolicyInputs(pkgInfo: PackageInfo, vars: PackagePolicy['vars'], inputs: PackagePolicyInput[], assetsMap: PackagePolicyAssetsMap, agentVersion?: string): PackagePolicyInput[];
export declare function _applyIndexPrivileges(packageDataStream: RegistryDataStream, stream: PackagePolicyInputStream): PackagePolicyInputStream;
export declare function _getAssetForTemplatePath(pkgInfo: PackageInfo, assetsMap: AssetsMap, datasetPath: string, templatePath: string): ArchiveEntry;
export interface NewPackagePolicyWithId extends NewPackagePolicy {
    id?: string;
    policy_id?: string | null;
    version?: string;
}
export declare const packagePolicyService: PackagePolicyClient;
export declare function updatePackageInputs(basePackagePolicy: NewPackagePolicy, packageInfo: PackageInfo, inputsUpdated?: InputsOverride[], dryRun?: boolean): DryRunPackagePolicy;
export declare function preconfigurePackageInputs(basePackagePolicy: NewPackagePolicy, packageInfo: PackageInfo, preconfiguredInputs?: PreconfiguredInputs[]): NewPackagePolicy;
export declare function _validateRestrictedFieldsNotModifiedOrThrow(opts: {
    pkgInfo: PackageInfo;
    oldPackagePolicy: PackagePolicy;
    packagePolicyUpdate: UpdatePackagePolicy;
}): void;
export declare function sendUpdatePackagePolicyTelemetryEvent(soClient: SavedObjectsClientContract, updatedPkgPolicies: UpdatePackagePolicy[], oldPackagePolicies: UpdatePackagePolicy[]): void;
export {};
