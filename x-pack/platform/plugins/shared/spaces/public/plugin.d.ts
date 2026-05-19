import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SpacesApi } from './types';
export interface PluginsSetup {
    home?: HomePublicPluginSetup;
    management?: ManagementSetup;
    cloud?: CloudSetup;
}
export interface PluginsStart {
    features: FeaturesPluginStart;
    management?: ManagementStart;
    cloud?: CloudStart;
    cps?: CPSPluginStart;
}
/**
 * Setup contract for the Spaces plugin.
 */
export type SpacesPluginSetup = ReturnType<SpacesPlugin['setup']>;
/**
 * Start contract for the Spaces plugin.
 */
export type SpacesPluginStart = ReturnType<SpacesPlugin['start']>;
export declare class SpacesPlugin implements Plugin<SpacesPluginSetup, SpacesPluginStart> {
    private readonly initializerContext;
    private spacesManager;
    private spacesApi;
    private eventTracker;
    private managementService?;
    private config;
    private readonly isServerless;
    private spaceAndExecutionContextSyncSubscription?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<PluginsStart, SpacesPluginStart>, plugins: PluginsSetup): {
        hasOnlyDefaultSpace: boolean;
        isSolutionViewEnabled: boolean;
    };
    start(core: CoreStart): SpacesApi;
    stop(): void;
}
