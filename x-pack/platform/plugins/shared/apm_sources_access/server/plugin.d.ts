import type { PluginInitializerContext, CoreSetup, Plugin, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { APMSourcesAccessConfig } from '../common/config_schema';
/**
 * APM Source setup services
 */
export type ApmSourcesAccessPluginSetup = ReturnType<ApmSourcesAccessPlugin['setup']>;
/**
 * APM Source start services
 */
export type ApmSourcesAccessPluginStart = ReturnType<ApmSourcesAccessPlugin['start']>;
export declare class ApmSourcesAccessPlugin implements Plugin<ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart> {
    config: APMSourcesAccessConfig;
    logger: Logger;
    constructor(initContext: PluginInitializerContext);
    getApmIndices: (savedObjectsClient: SavedObjectsClientContract) => Promise<{
        error: string;
        onboarding: string;
        span: string;
        transaction: string;
        metric: string;
        sourcemap: string;
    }>;
    /**
     * Registers the saved object definition and ui settings
     * for APM Sources.
     */
    setup(core: CoreSetup): {
        apmIndicesFromConfigFile: Readonly<{} & {
            error: string;
            span: string;
            transaction: string;
            metric: string;
            onboarding: string;
            sourcemap: string;
        }>;
        getApmIndices: (savedObjectsClient: SavedObjectsClientContract) => Promise<{
            error: string;
            onboarding: string;
            span: string;
            transaction: string;
            metric: string;
            sourcemap: string;
        }>;
    };
    /**
     * Initialises the user value for APM Sources UI settings.
     */
    start(): {
        getApmIndices: (savedObjectsClient: SavedObjectsClientContract) => Promise<{
            error: string;
            onboarding: string;
            span: string;
            transaction: string;
            metric: string;
            sourcemap: string;
        }>;
    };
    stop(): void;
}
