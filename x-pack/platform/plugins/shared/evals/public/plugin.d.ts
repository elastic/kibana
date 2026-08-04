import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies } from './types';
export declare class EvalsPublicPlugin implements Plugin<EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies> {
    private readonly config;
    constructor(initializerContext: PluginInitializerContext);
    setup(coreSetup: CoreSetup<EvalsStartDependencies>, { management, workflowsExtensions }: EvalsSetupDependencies): EvalsPublicSetup;
    start(core: CoreStart, _plugins: EvalsStartDependencies): EvalsPublicStart;
    stop(): void;
}
