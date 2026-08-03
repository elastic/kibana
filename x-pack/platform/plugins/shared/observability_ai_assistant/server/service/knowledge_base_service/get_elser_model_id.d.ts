import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
export declare function getElserModelId({ core, logger, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    logger: Logger;
}): Promise<string>;
