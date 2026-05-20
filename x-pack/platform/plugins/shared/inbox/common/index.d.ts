export declare const PLUGIN_ID: "inbox";
export declare const PLUGIN_NAME: "Inbox";
export declare const APP_PATH: "/app/inbox";
/**
 * API privilege names. Kept distinct so the Kibana feature model can grant
 * read-only users listing access without also letting them POST a response.
 * Route handlers reference these directly via `requiredPrivileges`.
 */
export declare const INBOX_API_PRIVILEGE_READ: "inbox_read";
export declare const INBOX_API_PRIVILEGE_RESPOND: "inbox_respond";
