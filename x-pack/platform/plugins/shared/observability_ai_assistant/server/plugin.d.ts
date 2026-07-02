import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ObservabilityAIAssistantConfig } from './config';
import { ObservabilityAIAssistantService } from './service';
import type { ObservabilityAIAssistantServerSetup, ObservabilityAIAssistantServerStart, ObservabilityAIAssistantPluginSetupDependencies, ObservabilityAIAssistantPluginStartDependencies } from './types';
export declare class ObservabilityAIAssistantPlugin implements Plugin<ObservabilityAIAssistantServerSetup, ObservabilityAIAssistantServerStart, ObservabilityAIAssistantPluginSetupDependencies, ObservabilityAIAssistantPluginStartDependencies> {
    logger: Logger;
    config: ObservabilityAIAssistantConfig;
    service: ObservabilityAIAssistantService | undefined;
    private isDev;
    constructor(context: PluginInitializerContext<ObservabilityAIAssistantConfig>);
    setup(core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies, ObservabilityAIAssistantServerStart>, plugins: ObservabilityAIAssistantPluginSetupDependencies): ObservabilityAIAssistantServerSetup;
    start(): ObservabilityAIAssistantServerStart;
}
