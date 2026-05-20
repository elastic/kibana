import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import type { ObservabilityAIAssistantConfig } from '../../config';
export declare function runStartupMigrations({ core, logger, config, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    logger: Logger;
    config: ObservabilityAIAssistantConfig;
}): Promise<void>;
export declare function isSemanticTextUnsupportedError(error: Error): any;
