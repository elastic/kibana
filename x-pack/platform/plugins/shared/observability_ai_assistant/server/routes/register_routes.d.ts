import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { ObservabilityAIAssistantRouteHandlerResources } from './types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
export declare function registerServerRoutes({ core, logger, dependencies, isDev, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    logger: Logger;
    dependencies: Omit<ObservabilityAIAssistantRouteHandlerResources, keyof DefaultRouteHandlerResources>;
    isDev: boolean;
}): void;
