import type { Plugin, CoreSetup } from '@kbn/core/public';
export declare class FeaturesPlugin implements Plugin<FeaturesPluginSetup, FeaturesPluginStart> {
    private apiClient?;
    setup(core: CoreSetup): void;
    start(): {
        getFeatures: () => Promise<import(".").KibanaFeature[]>;
    };
    stop(): void;
}
export type FeaturesPluginSetup = ReturnType<FeaturesPlugin['setup']>;
export type FeaturesPluginStart = ReturnType<FeaturesPlugin['start']>;
