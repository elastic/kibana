import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Conversation, ConversationRound, ConversationWithoutRounds, UserIdAndName } from '@kbn/agent-builder-common';
import type { ConversationCreateRequest, ConversationUpdateRequest } from './types';
import type { ConversationProperties } from './storage';
export type Document = Pick<GetResponse<ConversationProperties>, '_source' | '_id' | '_seq_no' | '_primary_term'>;
export declare const fromEs: (document: Document) => Conversation;
export declare const fromEsWithoutRounds: (document: Document) => ConversationWithoutRounds;
export declare const toEs: (conversation: Conversation, space: string) => ConversationProperties;
export declare const updateConversation: ({ conversation, update, space, updateDate, }: {
    conversation: Conversation;
    update: ConversationUpdateRequest;
    space: string;
    updateDate: Date;
}) => {
    space: string;
    updated_at: string;
    id: string;
    title: string;
    state?: import("@kbn/agent-builder-common/chat").ConversationInternalState;
    attachments?: import("@kbn/agent-builder-common").VersionedAttachment[];
    rounds: ConversationRound[];
    agent_id: string;
    user: UserIdAndName;
    created_at: string;
};
export declare const createRequestToEs: ({ conversation, space, currentUser, creationDate, }: {
    conversation: ConversationCreateRequest;
    currentUser: UserIdAndName;
    creationDate: Date;
    space: string;
}) => ConversationProperties;
