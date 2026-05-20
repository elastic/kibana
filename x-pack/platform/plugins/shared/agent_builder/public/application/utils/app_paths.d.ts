export declare const appPaths: {
    root: string;
    agent: {
        root: ({ agentId }: {
            agentId: string;
        }) => string;
        conversations: {
            new: ({ agentId }: {
                agentId: string;
            }) => string;
            byId: ({ agentId, conversationId }: {
                agentId: string;
                conversationId: string;
            }) => string;
        };
        skills: ({ agentId }: {
            agentId: string;
        }) => string;
        plugins: ({ agentId }: {
            agentId: string;
        }) => string;
        tools: ({ agentId }: {
            agentId: string;
        }) => string;
        overview: ({ agentId }: {
            agentId: string;
        }) => string;
    };
    manage: {
        agents: string;
        agentsNew: string;
        agentDetails: ({ agentId }: {
            agentId: string;
        }) => string;
        tools: string;
        toolsNew: string;
        toolDetails: ({ toolId }: {
            toolId: string;
        }) => string;
        toolsBulkImport: string;
        skills: string;
        skillsNew: string;
        skillDetails: ({ skillId }: {
            skillId: string;
        }) => string;
        plugins: string;
        pluginDetails: ({ pluginId }: {
            pluginId: string;
        }) => string;
        connectors: string;
        mcpClients: string;
    };
    legacy: {
        conversation: ({ conversationId }: {
            conversationId: string;
        }) => string;
    };
    agents: {
        list: string;
        new: string;
        edit: ({ agentId }: {
            agentId: string;
        }) => string;
    };
    connectors: {
        list: string;
    };
    tools: {
        list: string;
        new: string;
        details: ({ toolId }: {
            toolId: string;
        }) => string;
        bulkImportMcp: string;
    };
    skills: {
        list: string;
        new: string;
        details: ({ skillId }: {
            skillId: string;
        }) => string;
    };
    plugins: {
        list: string;
        details: ({ pluginId }: {
            pluginId: string;
        }) => string;
    };
};
