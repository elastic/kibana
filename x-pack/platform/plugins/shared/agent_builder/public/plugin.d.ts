import { type CoreSetup, type CoreStart, type Plugin, type PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ConfigSchema, AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies } from './types';
export declare class AgentBuilderPlugin implements Plugin<AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies> {
    logger: Logger;
    private conversationActiveConfig;
    private internalServices?;
    private setupServices?;
    private activeSidebarRef;
    private sidebarCallbacks;
    private appUpdater$;
    private isEarsEnabled;
    private experimentalDeepLinksSubscription?;
    constructor(context: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>, deps: AgentBuilderSetupDependencies): AgentBuilderPluginSetup;
    start(core: CoreStart, startDependencies: AgentBuilderStartDependencies): AgentBuilderPluginStart;
    stop(): void;
}
