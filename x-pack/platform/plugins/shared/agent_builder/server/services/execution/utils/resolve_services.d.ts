import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ConversationService } from '../../conversation';
import type { AgentsServiceStart } from '../../agents';
export declare const resolveServices: ({ agentId, connectorId, request, logger, inference, conversationService, agentService, uiSettings, savedObjects, }: {
    agentId: string;
    connectorId?: string;
    request: KibanaRequest;
    logger: Logger;
    inference: InferenceServerStart;
    conversationService: ConversationService;
    agentService: AgentsServiceStart;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
}) => Promise<{
    conversationClient: import("../../conversation").ConversationClient;
    chatModel: import("@kbn/inference-langchain").InferenceChatModel;
    selectedConnectorId: string;
}>;
