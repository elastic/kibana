import type { SmlSearchFilters } from '@kbn/agent-context-layer-plugin/public';
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
        search: (query: string, skipContent: boolean, filters?: SmlSearchFilters) => readonly ["sml", "search", {
            readonly query: string;
            readonly skipContent: boolean;
            readonly filters: Partial<Record<import("@kbn/agent-context-layer-plugin/public").SmlSearchFilterType, {
                ids?: string[];
            }>> | undefined;
        }];
    };
    plugins: {
        all: readonly ["plugins", "list"];
        byId: (pluginId?: string) => (string | undefined)[];
    };
    connectors: {
        all: readonly ["connectors"];
    };
    oauthClients: {
        all: readonly ["oauthClients", "list"];
    };
};
