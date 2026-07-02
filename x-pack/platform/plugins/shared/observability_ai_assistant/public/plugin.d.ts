import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { type AssistantScope } from '@kbn/ai-assistant-common';
import type { ConfigSchema, ObservabilityAIAssistantPluginSetupDependencies, ObservabilityAIAssistantPluginStartDependencies, ObservabilityAIAssistantPublicSetup, ObservabilityAIAssistantPublicStart, ObservabilityAIAssistantService } from './types';
export declare class ObservabilityAIAssistantPlugin implements Plugin<ObservabilityAIAssistantPublicSetup, ObservabilityAIAssistantPublicStart, ObservabilityAIAssistantPluginSetupDependencies, ObservabilityAIAssistantPluginStartDependencies> {
    logger: Logger;
    service?: ObservabilityAIAssistantService;
    scopeFromConfig?: AssistantScope;
    constructor(context: PluginInitializerContext<ConfigSchema>);
    setup(coreSetup: CoreSetup, pluginsSetup: ObservabilityAIAssistantPluginSetupDependencies): ObservabilityAIAssistantPublicSetup;
    start(coreStart: CoreStart, pluginsStart: ObservabilityAIAssistantPluginStartDependencies): ObservabilityAIAssistantPublicStart;
}
