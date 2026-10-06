export interface ConversationListOptions {
    agentId?: string;
    page?: number;
    perPage?: number;
    sortOrder?: 'asc' | 'desc';
    pinned?: boolean;
}
