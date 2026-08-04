import type { HttpSetup } from '@kbn/core-http-browser';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { DeleteConversationResponse, MarkReadConversationResponse, RenameConversationResponse } from '../../../common/http_api/conversations';
import type { ReadWorkspaceFileResponse } from '../../../common/http_api/workspace_files';
import type { ConversationListOptions, ConversationGetOptions, ConversationDeleteOptions } from '../../../common/conversations';
export declare class ConversationsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list({ agentId }: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
    get({ conversationId }: ConversationGetOptions): Promise<Conversation>;
    delete({ conversationId }: ConversationDeleteOptions): Promise<DeleteConversationResponse>;
    rename({ conversationId, title }: {
        conversationId: string;
        title: string;
    }): Promise<RenameConversationResponse>;
    updateReadStatus({ conversationId, read, }: {
        conversationId: string;
        read: boolean;
    }): Promise<MarkReadConversationResponse>;
    readWorkspaceFile({ conversationId, path, }: {
        conversationId: string;
        path: string;
    }): Promise<ReadWorkspaceFileResponse>;
}
