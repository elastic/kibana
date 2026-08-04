import type { FullscreenEntryPointSource } from '@kbn/agent-builder-common';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { CreateOAuthClientResponse } from '../../../common/http_api/oauth_clients';
export interface LocationState {
    shouldStickToBottom?: boolean;
    initialMessage?: string;
    attachments?: ConversationAttachment[];
    autoSendInitialMessage?: boolean;
    mcpClientCreated?: CreateOAuthClientResponse;
    entryPointSource?: FullscreenEntryPointSource;
}
export declare const INFERENCE_MANAGEMENT_APP_ID = "management";
export declare const INFERENCE_MANAGEMENT_PATH = "/modelManagement/model_settings";
export declare const useIsOnManagementLlmConnectorsPage: () => boolean;
export declare const useNavigation: () => {
    createAgentBuilderUrl: (path: string, params?: Record<string, string>) => string;
    navigateToAgentBuilderUrl: (path: string, params?: Record<string, string>, state?: LocationState) => void;
    navigateToManageConnectors: () => Promise<void>;
    manageConnectorsUrl: string;
};
