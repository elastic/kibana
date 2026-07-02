import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { InferenceConfig } from './config';
import type { InferenceServerSetup, InferenceServerStart, InferenceSetupDependencies, InferenceStartDependencies } from './types';
export declare const resolveReplacementsEncryptionKey: ({ namespace, anonymizationEnabled, policyService, }: {
    namespace: string;
    anonymizationEnabled: boolean;
    policyService?: {
        getReplacementsEncryptionKey: (targetNamespace: string) => Promise<string>;
    };
}) => Promise<string | undefined>;
export declare class InferencePlugin implements Plugin<InferenceServerSetup, InferenceServerStart, InferenceSetupDependencies, InferenceStartDependencies> {
    private logger;
    private config;
    private regexWorker?;
    private endpointIdCache;
    private tokenUsageLogger;
    constructor(context: PluginInitializerContext<InferenceConfig>);
    setup(coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>, pluginsSetup: InferenceSetupDependencies): InferenceServerSetup;
    start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart;
    stop(): Promise<void>;
}
