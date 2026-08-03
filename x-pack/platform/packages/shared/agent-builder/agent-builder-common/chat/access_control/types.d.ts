export declare enum ConversationAccessControlMode {
    Private = "private",
    Public = "public"
}
export interface ConversationAccessControl {
    access_mode: ConversationAccessControlMode;
}
export declare const getDefaultConversationAccessControl: () => ConversationAccessControl;
