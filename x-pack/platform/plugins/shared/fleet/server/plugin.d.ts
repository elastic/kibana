import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart, ElasticsearchServiceStart, HttpServiceSetup, KibanaRequest, Logger, Plugin, PluginInitializerContext, SavedObjectsServiceStart, SecurityServiceStart } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { LockManagerService } from '@kbn/lock-manager';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { AuditLogger, SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server/plugin';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { ReportingStart } from '@kbn/reporting-plugin/server';
import type { FleetConfigType } from '../common/types';
import type { FleetAuthz } from '../common';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { runWithCache } from './services/epm/packages/cache';
import type { MessageSigningServiceInterface } from './services/security';
import { type OutputClientInterface } from './services/output_client';
import type { ExternalCallback } from './types';
import type { AgentPolicyServiceInterface, AgentService, ArtifactsClientInterface, PackageService, CloudConnectorServiceInterface } from './services';
import { packagePolicyService } from './services';
import { type FleetUsage } from './collectors/register';
import { TelemetryEventsSender } from './telemetry/sender';
import { BulkActionsResolver } from './services/agents';
import { UnenrollInactiveAgentsTask } from './tasks/unenroll_inactive_agents_task';
import { type UninstallTokenServiceInterface } from './services/security/uninstall_token_service';
import { type FleetActionsClientInterface } from './services/actions';
import type { FilesClientFactory } from './services/files/types';
import { DeleteUnenrolledAgentsTask } from './tasks/delete_unenrolled_agents_task';
import { UpgradeAgentlessDeploymentsTask } from './tasks/agentless/upgrade_agentless_deployment';
import { SyncIntegrationsTask } from './tasks/sync_integrations/sync_integrations_task';
import { AutomaticAgentUpgradeTask } from './tasks/automatic_agent_upgrade_task';
import { AutoInstallContentPackagesTask } from './tasks/auto_install_content_packages_task';
import { AgentStatusChangeTask } from './tasks/agent_status_change_task';
import { FleetPolicyRevisionsCleanupTask } from './tasks/fleet_policy_revisions_cleanup/fleet_policy_revisions_cleanup_task';
import { type AgentlessPoliciesService } from './services/agentless/agentless_policies';
export interface FleetSetupDeps {
    security: SecurityPluginSetup;
    features?: FeaturesPluginSetup;
    encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
    cloud?: CloudSetup;
    usageCollection?: UsageCollectionSetup;
    spaces?: SpacesPluginStart;
    telemetry?: TelemetryPluginSetup;
    taskManager: TaskManagerSetupContract;
    fieldsMetadata: FieldsMetadataServerSetup;
}
export interface FleetStartDeps {
    data: DataPluginStart;
    licensing: LicensingPluginStart;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    security: SecurityPluginStart;
    telemetry?: TelemetryPluginStart;
    savedObjectsTagging: SavedObjectTaggingStart;
    taskManager: TaskManagerStartContract;
    spaces: SpacesPluginStart;
    alerting: AlertingServerStart;
    reporting: ReportingStart;
}
export interface FleetAppContext {
    elasticsearch: ElasticsearchServiceStart;
    data: DataPluginStart;
    encryptedSavedObjectsStart?: EncryptedSavedObjectsPluginStart;
    encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
    securityCoreStart: SecurityServiceStart;
    securitySetup: SecurityPluginSetup;
    securityStart: SecurityPluginStart;
    config$?: Observable<FleetConfigType>;
    configInitialValue: FleetConfigType;
    experimentalFeatures: ExperimentalFeatures;
    savedObjects: SavedObjectsServiceStart;
    savedObjectsTagging?: SavedObjectTaggingStart;
    isProductionMode: PluginInitializerContext['env']['mode']['prod'];
    kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
    kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
    kibanaInstanceId: PluginInitializerContext['env']['instanceUuid'];
    cloud?: CloudSetup;
    logger?: Logger;
    httpSetup?: HttpServiceSetup;
    telemetryEventsSender: TelemetryEventsSender;
    bulkActionsResolver: BulkActionsResolver;
    messageSigningService: MessageSigningServiceInterface;
    auditLogger?: AuditLogger;
    uninstallTokenService: UninstallTokenServiceInterface;
    unenrollInactiveAgentsTask: UnenrollInactiveAgentsTask;
    deleteUnenrolledAgentsTask: DeleteUnenrolledAgentsTask;
    updateAgentlessDeploymentsTask: UpgradeAgentlessDeploymentsTask;
    automaticAgentUpgradeTask: AutomaticAgentUpgradeTask;
    autoInstallContentPackagesTask: AutoInstallContentPackagesTask;
    agentStatusChangeTask?: AgentStatusChangeTask;
    fleetPolicyRevisionsCleanupTask?: FleetPolicyRevisionsCleanupTask;
    taskManagerStart?: TaskManagerStartContract;
    fetchUsage?: (abortController: AbortController) => Promise<FleetUsage | undefined>;
    syncIntegrationsTask: SyncIntegrationsTask;
    lockManagerService?: LockManagerService;
    alertingStart?: AlertingServerStart;
    reportingStart?: ReportingStart;
}
export type FleetSetupContract = void;
/**
 * Describes public Fleet plugin contract returned at the `startup` stage.
 */
export interface FleetStartContract {
    /**
     * returns a promise that resolved when fleet setup has been completed regardless if it was successful or failed).
     * Any consumer of fleet start services should first `await` for this promise to be resolved before using those
     * services
     */
    fleetSetupCompleted: () => Promise<void>;
    agentless: {
        enabled: boolean;
    };
    authz: {
        fromRequest(request: KibanaRequest): Promise<FleetAuthz>;
    };
    packageService: PackageService;
    agentService: AgentService;
    /**
     * Services for Fleet's package policies
     */
    packagePolicyService: typeof packagePolicyService;
    agentlessPoliciesService: AgentlessPoliciesService;
    runWithCache: typeof runWithCache;
    agentPolicyService: AgentPolicyServiceInterface;
    cloudConnectorService: CloudConnectorServiceInterface;
    /**
     * Register callbacks for inclusion in fleet API processing
     * @param args
     */
    registerExternalCallback: (...args: ExternalCallback) => void;
    /**
     * Create a Fleet Artifact Client instance
     * @param packageName
     */
    createArtifactsClient: (packageName: string) => ArtifactsClientInterface;
    /**
     * Create a Fleet Files client instance
     * @param packageName
     * @param type
     * @param maxSizeBytes
     */
    createFilesClient: Readonly<FilesClientFactory>;
    messageSigningService: MessageSigningServiceInterface;
    uninstallTokenService: UninstallTokenServiceInterface;
    createFleetActionsClient: (packageName: string) => FleetActionsClientInterface;
    getPackageSpecTagId: (spaceId: string, pkgName: string, tagName: string) => string;
    /**
     * Create a Fleet Output Client instance
     * @param packageName
     */
    createOutputClient: (request: KibanaRequest) => Promise<OutputClientInterface>;
}
export declare class FleetPlugin implements Plugin<FleetSetupContract, FleetStartContract, FleetSetupDeps, FleetStartDeps> {
    private readonly initializerContext;
    private config$;
    private configInitialValue;
    private cloud?;
    private logger?;
    private isProductionMode;
    private kibanaVersion;
    private kibanaBranch;
    private kibanaInstanceId;
    private httpSetup?;
    private securitySetup;
    private spacesPluginsStart?;
    private encryptedSavedObjectsSetup?;
    private readonly telemetryEventsSender;
    private readonly fleetStatus$;
    private bulkActionsResolver?;
    private fleetUsageSender?;
    private checkDeletedFilesTask?;
    private fleetMetricsTask?;
    private unenrollInactiveAgentsTask?;
    private deleteUnenrolledAgentsTask?;
    private updateAgentlessDeploymentsTask?;
    private syncIntegrationsTask?;
    private automaticAgentUpgradeTask?;
    private autoInstallContentPackagesTask?;
    private agentStatusChangeTask?;
    private fleetPolicyRevisionsCleanupTask?;
    private versionSpecificPolicyAssignmentTask?;
    private agentService?;
    private packageService?;
    private packagePolicyService?;
    private policyWatcher?;
    private fetchUsage?;
    private lockManagerService?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<FleetStartDeps, FleetStartContract>, deps: FleetSetupDeps): void;
    start(core: CoreStart, plugins: FleetStartDeps): FleetStartContract;
    stop(): void;
    private setupAgentService;
    private setupPackagePolicyService;
    private setupPackageService;
    private getLogger;
    private initializeUninstallTokens;
    private generateUninstallTokens;
    private validateUninstallTokens;
}
