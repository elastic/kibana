/**
 * Prefix of the chat system indices.
 *
 * The Kibana system user has the same permission on those indices than it has on Kibana system indices.
 */
export declare const chatSystemIndexPrefix = ".chat-";
/**
 * Helper function to define chat system indices.
 */
export declare const chatSystemIndex: (suffix: string) => string;
