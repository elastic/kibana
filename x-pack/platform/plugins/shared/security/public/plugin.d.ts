import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart as SecurityPluginStartWithoutDeprecatedMembers } from '@kbn/security-plugin-types-public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UiApi } from './ui_api';
export interface PluginSetupDependencies {
    licensing: LicensingPluginSetup;
    home?: HomePublicPluginSetup;
    management?: ManagementSetup;
    share?: SharePluginSetup;
    cloud?: CloudSetup;
}
export interface PluginStartDependencies {
    features: FeaturesPluginStart;
    dataViews?: DataViewsPublicPluginStart;
    management?: ManagementStart;
    spaces?: SpacesPluginStart;
    share?: SharePluginStart;
    cloud?: CloudStart;
}
export declare class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart, PluginSetupDependencies, PluginStartDependencies> {
    private readonly initializerContext;
    private readonly config;
    private sessionTimeout?;
    private readonly authenticationService;
    private readonly authorizationService;
    private readonly navControlService;
    private readonly securityLicenseService;
    private readonly managementService;
    private readonly securityCheckupService;
    private readonly anonymousAccessService;
    private readonly analyticsService;
    private authc;
    private authz;
    private securityApiClients;
    private buildFlavor;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<PluginStartDependencies>, { cloud, home, licensing, management, share }: PluginSetupDependencies): SecurityPluginSetup;
    start(core: CoreStart, { management, share }: PluginStartDependencies): SecurityPluginStart;
    stop(): void;
}
export interface SecurityPluginStart extends SecurityPluginStartWithoutDeprecatedMembers {
    /**
     * Exposes UI components that will be loaded asynchronously.
     * @deprecated
     */
    uiApi: UiApi;
}
