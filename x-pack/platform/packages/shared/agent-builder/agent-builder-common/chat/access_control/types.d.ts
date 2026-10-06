export declare enum ConversationAccessControlMode {
    Private = "private",
    Public = "public"
}
export declare enum ConversationAccessControlRole {
    Member = "member"
}
export type ConversationAccessControlPrincipalType = 'user';
export interface ConversationAccessControlEntry {
    type: ConversationAccessControlPrincipalType;
    id: string;
    role: ConversationAccessControlRole;
    added_at: string;
}
export interface ConversationAccessControl {
    access_mode: ConversationAccessControlMode;
    entries: ConversationAccessControlEntry[];
}
export declare const getDefaultConversationAccessControl: () => ConversationAccessControl;
export declare const normalizeConversationAccessControl: (accessControl: Partial<ConversationAccessControl> | undefined) => ConversationAccessControl;
/** True when this conversation is readable by any user with access to its agent. */
export declare const isPublicConversation: (accessControl: Partial<ConversationAccessControl> | undefined) => boolean;
/** True when this conversation is shared with specific users rather than with everyone. */
export declare const isPrivatelySharedConversation: (accessControl: Partial<ConversationAccessControl> | undefined) => boolean;
/** True when someone other than the owner can read and converse in this conversation. */
export declare const isSharedConversation: (accessControl: Partial<ConversationAccessControl> | undefined) => boolean;
/** An access-control entry without the server-assigned `added_at` timestamp, for write operations. */
export type ConversationAccessControlEntryInput = Omit<ConversationAccessControlEntry, 'added_at'>;
/** Access-control shape for write operations. `entries` is optional and defaults to `[]` server-side. */
export interface ConversationAccessControlInput {
    access_mode: ConversationAccessControlMode;
    entries?: ConversationAccessControlEntryInput[];
}
export declare const CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES = 100;
export declare const CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;
export declare const isConversationAccessControlRole: (value: unknown) => value is ConversationAccessControlRole;
