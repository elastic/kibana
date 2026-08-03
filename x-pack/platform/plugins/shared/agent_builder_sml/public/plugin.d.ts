import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
export interface AgentBuilderSmlPublicPluginSetupDeps {
}
export interface AgentBuilderSmlPublicPluginStartDeps {
}
export interface AgentBuilderSmlPublicPluginSetup {
}
export interface AgentBuilderSmlPublicPluginStart {
}
export declare class AgentBuilderSmlPublicPlugin implements Plugin<AgentBuilderSmlPublicPluginSetup, AgentBuilderSmlPublicPluginStart, AgentBuilderSmlPublicPluginSetupDeps, AgentBuilderSmlPublicPluginStartDeps> {
    constructor(_context: PluginInitializerContext);
    setup(_core: CoreSetup<AgentBuilderSmlPublicPluginStartDeps, AgentBuilderSmlPublicPluginStart>, _deps: AgentBuilderSmlPublicPluginSetupDeps): AgentBuilderSmlPublicPluginSetup;
    start(_coreStart: CoreStart, _deps: AgentBuilderSmlPublicPluginStartDeps): AgentBuilderSmlPublicPluginStart;
    stop(): void;
}
