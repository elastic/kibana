/**
 * List of internally used namespaces
 * Note: those are not necessarily all protected.
 */
export declare const internalNamespaces: {
    readonly platformCore: "platform.core";
    readonly platformAlerting: "platform.alerting";
    readonly platformDashboard: "platform.dashboard";
    readonly platformStreams: "platform.streams";
    readonly filestore: "filestore";
    readonly attachments: "attachments";
    readonly observability: "observability";
    readonly search: "search";
    readonly security: "security";
    readonly streams: "platform.streams";
    readonly workflows: "platform.workflows";
};
/**
 * List of protected namespaces which can only be used by internal tools.
 */
export declare const protectedNamespaces: string[];
/**
 * Checks if the provided tool name belongs to a protected namespace.
 */
export declare const isInProtectedNamespace: (toolName: string) => boolean;
/**
 * Checks if the provided name is an internal or protected namespace.
 */
export declare const hasNamespaceName: (toolName: string) => boolean;
