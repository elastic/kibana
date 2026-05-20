import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { AgentContextLayerPluginSetup, AgentContextLayerPluginStart, AgentContextLayerSetupDependencies, AgentContextLayerStartDependencies } from './types';
export declare class AgentContextLayerPlugin implements Plugin<AgentContextLayerPluginSetup, AgentContextLayerPluginStart, AgentContextLayerSetupDependencies, AgentContextLayerStartDependencies> {
    private logger;
    private smlServiceInstance;
    private smlService?;
    constructor(context: PluginInitializerContext);
    setup(coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>, setupDeps: AgentContextLayerSetupDependencies): AgentContextLayerPluginSetup;
    start(coreStart: CoreStart, { taskManager, spaces, security }: AgentContextLayerStartDependencies): AgentContextLayerPluginStart;
    stop(): void;
}
