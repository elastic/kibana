import type { CoreSetup, CoreStart, KibanaRequest, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginSetupDependencies, SearchInferenceEndpointsPluginStart, SearchInferenceEndpointsPluginStartDependencies } from './types';
export declare class SearchInferenceEndpointsPlugin implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart, SearchInferenceEndpointsPluginSetupDependencies, SearchInferenceEndpointsPluginStartDependencies> {
    private readonly logger;
    private readonly config;
    private dynamicConnectorsPoller?;
    private readonly featureRegistry;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<SearchInferenceEndpointsPluginStartDependencies, SearchInferenceEndpointsPluginStart>, plugins: SearchInferenceEndpointsPluginSetupDependencies): {
        features: {
            register: (feature: import("./types").InferenceFeatureConfig) => import("./types").RegisterResult;
        };
    };
    start(core: CoreStart, plugins: SearchInferenceEndpointsPluginStartDependencies): {
        features: {
            get: (featureId: string) => import("./types").InferenceFeatureConfig | undefined;
            getAll: () => import("./types").InferenceFeatureConfig[];
            register: (feature: import("./types").InferenceFeatureConfig) => import("./types").RegisterResult;
        };
        endpoints: {
            getForFeature: (featureId: string, request: KibanaRequest) => Promise<{
                endpoints: import("./lib/merge_connectors").ApiInferenceConnector[];
                warnings: string[];
                soEntryFound: boolean;
            }>;
        };
    };
    stop(): void;
}
