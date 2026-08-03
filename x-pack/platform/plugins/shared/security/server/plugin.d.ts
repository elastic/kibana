import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { CoreSetup, CoreStart, KibanaRequest, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { AuthorizationServiceSetup, SecurityPluginSetup as SecurityPluginSetupWithoutDeprecatedMembers, SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { AuthenticatedUser } from '../common';
export type SpacesService = Pick<SpacesPluginSetup['spacesService'], 'getSpaceId' | 'namespaceToSpaceId'>;
/**
 * Describes public Security plugin contract returned at the `setup` stage.
 */
export interface SecurityPluginSetup extends SecurityPluginSetupWithoutDeprecatedMembers {
    /**
     * @deprecated Use `authc` methods from the `SecurityServiceStart` contract instead.
     */
    authc: {
        getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
    };
    /**
     * @deprecated Use `authz` methods from the `SecurityServiceStart` contract instead.
     */
    authz: AuthorizationServiceSetup;
}
export interface PluginSetupDependencies {
    features: FeaturesPluginSetup;
    licensing: LicensingPluginSetup;
    taskManager: TaskManagerSetupContract;
    usageCollection?: UsageCollectionSetup;
    spaces?: SpacesPluginSetup;
    cloud?: CloudSetup;
}
export interface PluginStartDependencies {
    cloud?: CloudStart;
    features: FeaturesPluginStart;
    licensing: LicensingPluginStart;
    taskManager: TaskManagerStartContract;
    spaces?: SpacesPluginStart;
}
/**
 * Represents Security Plugin instance that will be managed by the Kibana plugin system.
 */
export declare class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart, PluginSetupDependencies> {
    private readonly initializerContext;
    private readonly logger;
    private authorizationSetup?;
    private auditSetup?;
    private configSubscription?;
    private config?;
    private readonly getConfig;
    private session?;
    private readonly getSession;
    private kibanaIndexName?;
    private readonly getKibanaIndexName;
    private readonly authenticationService;
    private authenticationStart?;
    private readonly getAuthentication;
    private readonly featureUsageService;
    private featureUsageServiceStart?;
    private readonly getFeatureUsageService;
    private readonly auditService;
    private readonly securityLicenseService;
    private readonly analyticsService;
    private readonly authorizationService;
    private readonly elasticsearchService;
    private readonly sessionManagementService;
    private readonly anonymousAccessService;
    private anonymousAccessStart?;
    private readonly getAnonymousAccess;
    private readonly userProfileService;
    private userProfileStart?;
    private readonly getUserProfileService;
    private readonly fipsService;
    private fipsServiceSetup?;
    private elasticsearchUrl?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<PluginStartDependencies, SecurityPluginStart>, { features, licensing, taskManager, usageCollection, spaces, cloud }: PluginSetupDependencies): Readonly<SecurityPluginSetup>;
    start(core: CoreStart, { cloud, features, licensing, taskManager, spaces }: PluginStartDependencies): Readonly<SecurityPluginStart>;
    stop(): void;
    private registerDeprecations;
    private decodeElasticsearchUrlFromCloudId;
}
