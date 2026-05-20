import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { CustomIntegrationsSetup, CustomIntegrationsStart } from '@kbn/custom-integrations-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { AutomaticImportPluginStart } from '@kbn/automatic-import-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ReportingStart } from '@kbn/reporting-plugin/public';
import type { FleetAuthz } from '../common';
import type { FleetConfigType } from '../common/types';
import type { RequestError } from './hooks';
import type { GetBulkAssetsRequest, GetBulkAssetsResponse, UIExtensionRegistrationCallback } from './types';
export type { FleetConfigType } from '../common/types';
export interface FleetSetup {
}
/**
 * Describes public Fleet plugin contract returned at the `start` stage.
 */
export interface FleetStart {
    /** Authorization for the current user */
    authz: FleetAuthz;
    config: FleetConfigType;
    registerExtension: UIExtensionRegistrationCallback;
    isInitialized: () => Promise<true>;
    hooks: {
        epm: {
            getBulkAssets: (body: GetBulkAssetsRequest['body']) => Promise<SendRequestResponse<GetBulkAssetsResponse, RequestError>>;
        };
    };
}
export interface FleetSetupDeps {
    data: DataPublicPluginSetup;
    home?: HomePublicPluginSetup;
    cloud?: CloudSetup;
    globalSearch?: GlobalSearchPluginSetup;
    customIntegrations: CustomIntegrationsSetup;
    usageCollection?: UsageCollectionSetup;
}
export interface FleetStartDeps {
    licensing: LicensingPluginStart;
    data: DataPublicPluginStart;
    dashboard: DashboardStart;
    dataViews: DataViewsPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    navigation: NavigationPublicPluginStart;
    customIntegrations: CustomIntegrationsStart;
    share: SharePluginStart;
    automaticImport?: AutomaticImportPluginStart;
    cloud?: CloudStart;
    usageCollection?: UsageCollectionStart;
    embeddable: EmbeddableStart;
    logsDataAccess: LogsDataAccessPluginStart;
    reporting?: ReportingStart;
}
export interface FleetStartServices extends CoreStart, Exclude<FleetStartDeps, 'cloud'> {
    storage: Storage;
    share: SharePluginStart;
    dashboard: DashboardStart;
    automaticImport?: AutomaticImportPluginStart;
    cloud?: CloudSetup & CloudStart;
    discover?: DiscoverStart;
    spaces?: SpacesPluginStart;
    authz: FleetAuthz;
}
export declare class FleetPlugin implements Plugin<FleetSetup, FleetStart, FleetSetupDeps, FleetStartDeps> {
    private readonly initializerContext;
    private config;
    private kibanaVersion;
    private extensions;
    private experimentalFeatures;
    private storage;
    private appUpdater$;
    private logger;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<FleetStartDeps, FleetStart>, deps: FleetSetupDeps): {};
    start(core: CoreStart, deps: FleetStartDeps): FleetStart;
    stop(): void;
}
