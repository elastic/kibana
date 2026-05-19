import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { LicenseManagementLocator } from './locator';
interface PluginsDependenciesSetup {
    management: ManagementSetup;
    licensing: LicensingPluginSetup;
    share: SharePluginSetup;
}
interface PluginsDependenciesStart {
    telemetry?: TelemetryPluginStart;
}
export interface LicenseManagementUIPluginSetup {
    enabled: boolean;
    locator: undefined | LicenseManagementLocator;
}
export type LicenseManagementUIPluginStart = void;
export declare class LicenseManagementUIPlugin implements Plugin<LicenseManagementUIPluginSetup, LicenseManagementUIPluginStart, PluginsDependenciesSetup, PluginsDependenciesStart> {
    private readonly initializerContext;
    private breadcrumbService;
    private locator?;
    constructor(initializerContext: PluginInitializerContext);
    setup(coreSetup: CoreSetup<PluginsDependenciesStart>, plugins: PluginsDependenciesSetup): LicenseManagementUIPluginSetup;
    start(): LicenseManagementUIPluginStart;
    stop(): void;
}
export {};
