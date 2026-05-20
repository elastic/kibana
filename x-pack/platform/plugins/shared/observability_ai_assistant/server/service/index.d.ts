import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantScreenContextRequest } from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { ChatFunctionClient } from './chat_function_client';
import { ObservabilityAIAssistantClient } from './client';
import type { RegistrationCallback, RespondFunctionResources } from './types';
import type { ObservabilityAIAssistantConfig } from '../config';
export declare function getResourceName(resource: string): string;
export declare const resourceNames: {
    componentTemplate: {
        conversations: string;
        kb: string;
    };
    writeIndexAlias: {
        conversations: string;
        kb: string;
    };
    indexPatterns: {
        conversations: string;
        kb: string;
    };
    indexTemplate: {
        conversations: string;
        kb: string;
    };
    concreteWriteIndexName: {
        conversations: string;
        kb: string;
    };
};
export declare class ObservabilityAIAssistantService {
    private readonly core;
    private readonly logger;
    private config;
    private readonly registrations;
    constructor({ logger, core, config, }: {
        logger: Logger;
        core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
        config: ObservabilityAIAssistantConfig;
    });
    getClient({ request, scopes, }: {
        request: KibanaRequest;
        scopes?: AssistantScope[];
    }): Promise<ObservabilityAIAssistantClient>;
    getFunctionClient({ screenContexts, signal, resources, client, scopes, }: {
        screenContexts: ObservabilityAIAssistantScreenContextRequest[];
        signal: AbortSignal;
        resources: RespondFunctionResources;
        client: ObservabilityAIAssistantClient;
        scopes: AssistantScope[];
    }): Promise<ChatFunctionClient>;
    register(cb: RegistrationCallback): void;
}
