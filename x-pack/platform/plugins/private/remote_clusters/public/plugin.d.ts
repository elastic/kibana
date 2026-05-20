import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Dependencies } from './types';
export interface RemoteClustersPluginSetup {
    isUiEnabled: boolean;
}
export declare class RemoteClustersUIPlugin implements Plugin<RemoteClustersPluginSetup, void, Dependencies, any> {
    private readonly initializerContext;
    constructor(initializerContext: PluginInitializerContext);
    private canUseApiKeyTrustModel;
    private licensingSubscription?;
    setup({ notifications: { toasts }, http, getStartServices }: CoreSetup, { management, usageCollection, cloud, share }: Dependencies): {
        isUiEnabled: boolean;
    };
    start({ application }: CoreStart, { licensing }: Dependencies): void;
    stop(): void;
}
