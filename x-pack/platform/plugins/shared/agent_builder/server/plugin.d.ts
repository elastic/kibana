import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { AgentBuilderConfig } from './config';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies } from './types';
export declare class AgentBuilderPlugin implements Plugin<AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies> {
    private logger;
    private config;
    private serviceManager;
    private usageCounter?;
    private trackingService?;
    private analyticsService?;
    private home;
    constructor(context: PluginInitializerContext<AgentBuilderConfig>);
    setup(coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>, setupDeps: AgentBuilderSetupDependencies): AgentBuilderPluginSetup;
    start(coreStart: CoreStart, { inference, spaces, actions, taskManager }: AgentBuilderStartDependencies): AgentBuilderPluginStart;
    stop(): void;
}
