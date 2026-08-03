import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
export declare function createOrUpdateKnowledgeBaseIndexAssets({ logger, core, inferenceId: componentTemplateInferenceId, }: {
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    inferenceId: string;
}): Promise<void>;
