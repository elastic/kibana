import type { AuthenticatedUser, ElasticsearchClient, SavedObjectsBulkUpdateResponse, SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { AgentPolicy, AgentPolicySOAttributes, ExternalCallback, FullAgentPolicy, ListWithKuery, NewAgentPolicy, NewPackagePolicy, PreconfiguredAgentPolicy, OutputsForAgentPolicy } from '../types';
import type { DeleteAgentPolicyResponse, FetchAllAgentPoliciesOptions, FetchAllAgentPolicyIdsOptions, FleetServerPolicy, PackageInfo } from '../../common/types';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
export declare function getAgentPolicySavedObjectType(): Promise<"ingest-agent-policies" | "fleet-agent-policies">;
declare class AgentPolicyService {
    protected getLogger(...childContextPaths: string[]): Logger;
    private triggerAgentPolicyUpdatedEvent;
    private _update;
    ensurePreconfiguredAgentPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, config: PreconfiguredAgentPolicy): Promise<{
        created: boolean;
        policy?: AgentPolicy;
    }>;
    private ensureAgentPolicy;
    hasAPMIntegration(agentPolicy: AgentPolicy): boolean;
    hasFleetServerIntegration(agentPolicy: AgentPolicy): boolean;
    hasSyntheticsIntegration(agentPolicy: AgentPolicy): boolean;
    runExternalCallbacks(externalCallbackType: ExternalCallback[0], agentPolicy: NewAgentPolicy | Partial<AgentPolicy> | AgentPolicy, requestSpaceId?: string): Promise<NewAgentPolicy | Partial<AgentPolicy> | AgentPolicy>;
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentPolicy: NewAgentPolicy, options?: {
        id?: string;
        user?: AuthenticatedUser;
        request?: KibanaRequest;
        skipDeploy?: boolean;
        hasFleetServer?: boolean;
    }): Promise<AgentPolicy>;
    createWithPackagePolicies({ soClient, esClient, agentPolicy, packagePolicies, options: { hasFleetServer, withSysMonitoring, monitoringEnabled, spaceId, user, request, force, forcePackagePolicyCreation, }, }: {
        soClient: SavedObjectsClientContract;
        esClient: ElasticsearchClient;
        agentPolicy: NewAgentPolicy;
        packagePolicies: Array<Omit<NewPackagePolicy, 'policy_id' | 'policy_ids'>>;
        options: {
            hasFleetServer?: boolean;
            withSysMonitoring: boolean;
            monitoringEnabled?: string[];
            spaceId: string;
            user?: AuthenticatedUser;
            request?: KibanaRequest;
            /** Pass force to all following calls: package install, policy creation */
            force?: boolean;
            /** Pass force only to package policy creation */
            forcePackagePolicyCreation?: boolean;
        };
    }): Promise<AgentPolicy>;
    requireUniqueName(soClient: SavedObjectsClientContract, policy: {
        id?: string;
        name: string;
        space_ids?: string[];
        supports_agentless?: boolean | null;
    }): Promise<void>;
    get(soClient: SavedObjectsClientContract, id: string, withPackagePolicies?: boolean, options?: {
        /**
         * The space id of the policy. Note that although this can be set, the `soClient` still
         * needs access to the space to retrieve the agent policy.
         * When using an un-scoped so client (has access to all spaces) and wanting to retrieve data across
         * all space, use a value of `*` (ex. `spaceId: '*'`)
         */
        spaceId?: string;
    }): Promise<AgentPolicy | null>;
    getByIds(soClient: SavedObjectsClientContract, ids: Array<string | {
        id: string;
        /**
         * The space id associated with the agent policy. When using an un-scoped SO client, the
         * space id can be set to `*` which will look for that agent policy across all spaces
         */
        spaceId?: string;
    }>, options?: {
        fields?: string[];
        withPackagePolicies?: boolean;
        ignoreMissing?: boolean;
        /** Space ID to be applied to the retrieval of the policies (only used if not already defined as part of `ids` argument) */
        spaceId?: string;
    }): Promise<AgentPolicy[]>;
    list(soClient: SavedObjectsClientContract, options: ListWithKuery & {
        withPackagePolicies?: boolean;
        fields?: string[];
        esClient?: ElasticsearchClient;
        withAgentCount?: boolean;
        spaceId?: string;
    }): Promise<{
        items: AgentPolicy[];
        total: number;
        page: number;
        perPage: number;
    }>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, agentPolicy: Partial<AgentPolicy>, options?: {
        user?: AuthenticatedUser;
        force?: boolean;
        spaceId?: string;
        request?: KibanaRequest;
        skipValidation?: boolean;
        bumpRevision?: boolean;
        requestSpaceId?: string;
        isRequiredVersionsAuthorized?: boolean;
    }): Promise<AgentPolicy>;
    copy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, newAgentPolicyProps: Pick<AgentPolicy, 'name' | 'description'>, options?: {
        user?: AuthenticatedUser;
    }): Promise<AgentPolicy>;
    bumpRevision(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, options?: {
        user?: AuthenticatedUser;
        removeProtection?: boolean;
        asyncDeploy?: boolean;
        skipValidation?: boolean;
        hasAgentVersionConditions?: boolean;
    }): Promise<void>;
    private computeMinAgentVersionData;
    /**
     * Remove an output from all agent policies that are using it, and replace the output by the default ones.
     * @param esClient
     * @param outputId
     */
    removeOutputFromAll(esClient: ElasticsearchClient, outputId: string, options?: {
        force?: boolean;
    }): Promise<void>;
    /**
     * Remove a Fleet Server from all agent policies that are using it, to use the default one instead.
     */
    removeFleetServerHostFromAll(esClient: ElasticsearchClient, fleetServerHostId: string, options?: {
        force?: boolean;
    }): Promise<void>;
    private _bumpPolicies;
    bumpAllAgentPoliciesForOutput(esClient: ElasticsearchClient, outputId: string, options?: {
        user?: AuthenticatedUser;
    }): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>;
    bumpAllAgentPolicies(esClient: ElasticsearchClient, options?: {
        user?: AuthenticatedUser;
    }): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>;
    delete(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, options?: {
        force?: boolean;
        user?: AuthenticatedUser;
    }): Promise<DeleteAgentPolicyResponse>;
    deployPolicy(soClient: SavedObjectsClientContract, agentPolicyId: string, agentPolicy?: AgentPolicy | null, options?: {
        throwOnAgentlessError?: boolean;
    }): Promise<void>;
    deployPolicies(soClient: SavedObjectsClientContract, agentPolicyIds: string[], agentPolicies?: AgentPolicy[], options?: {
        throwOnAgentlessError?: boolean;
        throwOnAnyError?: boolean;
        agentVersions?: string[];
    }): Promise<void>;
    deleteFleetServerPoliciesForPolicyId(esClient: ElasticsearchClient, agentPolicyId: string): Promise<void>;
    getLatestFleetPolicyRevision(esClient: ElasticsearchClient, agentPolicyId: string): Promise<Pick<FleetServerPolicy, 'revision_idx' | 'policy_id'> | null>;
    getFleetServerPolicy(esClient: ElasticsearchClient, agentPolicyId: string, revision: number): Promise<FleetServerPolicy | null | undefined>;
    getFullAgentConfigMap(soClient: SavedObjectsClientContract, id: string, agentVersion: string, options?: {
        standalone: boolean;
    }): Promise<string | null>;
    getFullAgentManifest(fleetServer: string, enrolToken: string, agentVersion: string): Promise<string | null>;
    getFullAgentPolicy(soClient: SavedObjectsClientContract, id: string, options?: {
        standalone?: boolean;
        agentPolicy?: AgentPolicy;
        agentVersion?: string;
    }): Promise<FullAgentPolicy | null>;
    /**
     * Remove a download source from all agent policies that are using it, and replace the output by the default ones.
     * @param soClient
     * @param esClient
     * @param downloadSourceId
     */
    removeDefaultSourceFromAll(esClient: ElasticsearchClient, downloadSourceId: string): Promise<void>;
    bumpAllAgentPoliciesForDownloadSource(esClient: ElasticsearchClient, downloadSourceId: string, options?: {
        user?: AuthenticatedUser;
    }): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>;
    bumpAllAgentPoliciesForFleetServerHosts(esClient: ElasticsearchClient, fleetServerHostId: string, options?: {
        user?: AuthenticatedUser;
    }): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>;
    bumpAgentPoliciesByIds(agentPolicyIds: string[], options?: {
        user?: AuthenticatedUser;
    }, spaceId?: string): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>;
    getInactivityTimeouts(): Promise<Array<{
        policyIds: string[];
        inactivityTimeout: number;
    }>>;
    turnOffAgentTamperProtections(soClient: SavedObjectsClientContract): Promise<{
        updatedPolicies: Array<Partial<AgentPolicy>> | null;
        failedPolicies: Array<{
            id: string;
            error: Error | SavedObjectError;
        }>;
    }>;
    getAllManagedAgentPolicies(soClient: SavedObjectsClientContract): Promise<import("@kbn/core/server").SavedObjectsFindResult<AgentPolicySOAttributes>[]>;
    fetchAllAgentPolicyIds(soClient: SavedObjectsClientContract, { perPage, kuery, spaceId }?: FetchAllAgentPolicyIdsOptions): Promise<AsyncIterable<string[]>>;
    fetchAllAgentPolicies(soClient: SavedObjectsClientContract, { perPage, kuery, sortOrder, sortField, fields, spaceId, }?: FetchAllAgentPoliciesOptions): Promise<AsyncIterable<AgentPolicy[]>>;
    getAllOutputsForPolicy(agentPolicy: AgentPolicy): Promise<OutputsForAgentPolicy>;
    listAllOutputsForPolicies(agentPolicies: AgentPolicy[]): Promise<OutputsForAgentPolicy[]>;
    private checkTamperProtectionLicense;
    private checkForValidUninstallToken;
    private checkAgentless;
    private packagePoliciesWithSingleAndMultiplePolicies;
    private prepareAsNewSo;
    createVerifierPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, connector: {
        id: string;
        attributes: CloudConnectorSOAttributes;
    }, verificationInfo: {
        policyTemplates: string[];
        packageName: string;
        packageTitle: string;
        packageVersion: string;
    }): Promise<{
        policyId: string;
    }>;
    deleteVerifierPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, policyId: string): Promise<void>;
}
export declare const agentPolicyService: AgentPolicyService;
export declare function addPackageToAgentPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentPolicy: AgentPolicy, packageInfo: PackageInfo, packagePolicyName?: string, packagePolicyId?: string | number, packagePolicyDescription?: string, transformPackagePolicy?: (p: NewPackagePolicy) => NewPackagePolicy, bumpAgentPolicyRevison?: boolean): Promise<void>;
export {};
