import type { SmlSearchFilters, SmlSearchConstraints } from '@kbn/agent-builder-sml-plugin/public';
/**
 * Query keys for react-query
 */
export declare const queryKeys: {
    conversations: {
        all: readonly ["conversations"];
        byAgent: (agentId: string) => (string | {
            agentId: string;
        })[];
        byId: (conversationId: string) => string[];
    };
    agentProfiles: {
        all: readonly ["agentProfiles"];
        byId: (agentProfileId?: string) => (string | undefined)[];
        accessControl: (agentProfileId: string) => readonly ["agentProfiles", string, "accessControl"];
    };
    security: {
        users: readonly ["security", "users"];
        suggestUsers: (query: string) => readonly ["security", "users", "suggest", string];
        roles: readonly ["security", "roles"];
    };
    tools: {
        all: readonly ["tools", "list"];
        typeInfo: readonly ["tools", "typeInfo"];
        byId: (toolId?: string) => (string | undefined)[];
        indexSearch: {
            resolveTargets: (pattern: string) => string[];
        };
        workflows: {
            byId: (workflowId?: string) => (string | undefined)[];
            list: () => readonly ["tools", "workflows", "list"];
        };
        connectors: {
            list: (type?: string) => (string | undefined)[];
            get: (connectorId: string) => string[];
            listMcpTools: (connectorId: string) => string[];
        };
        health: {
            list: () => readonly ["tools", "health", "list"];
            byId: (toolId: string) => string[];
            mcp: () => readonly ["tools", "health", "mcp"];
        };
        namespace: {
            validate: (namespace: string, connectorId?: string) => readonly ["tools", "namespace", "validate", string, string | undefined];
        };
    };
    skills: {
        all: readonly ["skills"];
        list: readonly ["skills", "list"];
        byId: (skillId?: string) => (string | undefined)[];
        byAgent: (agentId?: string) => (string | undefined)[];
    };
    sml: {
        search: (query: string, constraints?: SmlSearchConstraints, filters?: SmlSearchFilters) => readonly ["sml", "search", {
            readonly query: string;
            readonly constraints: Partial<Record<import("@kbn/agent-builder-sml-plugin/public").SmlSearchFilterType, {
                ids?: string[];
            }>> | undefined;
            readonly filters: SmlSearchFilters | undefined;
        }];
        autocomplete: (query: string, constraints?: SmlSearchConstraints, filters?: SmlSearchFilters) => readonly ["sml", "autocomplete", {
            readonly query: string;
            readonly constraints: Partial<Record<import("@kbn/agent-builder-sml-plugin/public").SmlSearchFilterType, {
                ids?: string[];
            }>> | undefined;
            readonly filters: SmlSearchFilters | undefined;
        }];
    };
    plugins: {
        all: readonly ["plugins", "list"];
        byId: (pluginId?: string) => (string | undefined)[];
    };
    connectors: {
        all: readonly ["connectors"];
    };
    workspaceFiles: {
        byPath: (conversationId: string, path: string) => readonly ["workspaceFiles", string, string];
    };
    oauthClients: {
        all: readonly ["oauthClients", "list"];
        byId: (clientId: string) => readonly ["oauthClients", string];
    };
};
