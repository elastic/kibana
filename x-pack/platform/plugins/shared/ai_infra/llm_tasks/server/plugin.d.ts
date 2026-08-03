import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LlmTasksConfig } from './config';
import type { LlmTasksPluginSetup, LlmTasksPluginStart, PluginSetupDependencies, PluginStartDependencies } from './types';
export declare class LlmTasksPlugin implements Plugin<LlmTasksPluginSetup, LlmTasksPluginStart, PluginSetupDependencies, PluginStartDependencies> {
    private logger;
    constructor(context: PluginInitializerContext<LlmTasksConfig>);
    setup(coreSetup: CoreSetup<PluginStartDependencies, LlmTasksPluginStart>, setupDependencies: PluginSetupDependencies): LlmTasksPluginSetup;
    start(core: CoreStart, startDependencies: PluginStartDependencies): LlmTasksPluginStart;
}
