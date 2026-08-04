import type { HttpSetup } from '@kbn/core-http-browser';
import type { ExecuteToolParams } from '@kbn/agent-builder-browser';
import type { GetToolResponse, DeleteToolResponse, CreateToolPayload, UpdateToolPayload, CreateToolResponse, UpdateToolResponse, BulkDeleteToolResponse, ExecuteToolResponse, ResolveSearchSourcesResponse, ListWorkflowsResponse, GetWorkflowResponse, ListConnectorsResponse, ListMcpToolsResponse, GetConnectorResponse, GetToolHealthResponse, ListToolHealthResponse, ListMcpToolsHealthResponse, BulkCreateMcpToolsResponse, BulkDeleteConnectorsResponse, ValidateNamespaceResponse } from '../../../common/http_api/tools';
export declare class ToolsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list(): Promise<import("@kbn/agent-builder-common").ToolDefinition<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>>[]>;
    get({ toolId }: {
        toolId: string;
    }): Promise<GetToolResponse>;
    delete({ toolId, force }: {
        toolId: string;
        force?: boolean;
    }): Promise<DeleteToolResponse>;
    create(tool: CreateToolPayload): Promise<CreateToolResponse>;
    update(id: string, update: UpdateToolPayload): Promise<UpdateToolResponse>;
    execute({ toolId, toolParams, connectorId }: ExecuteToolParams): Promise<ExecuteToolResponse>;
    bulkDelete(toolIds: string[], options?: {
        force?: boolean;
    }): Promise<BulkDeleteToolResponse>;
    resolveSearchSources({ pattern }: {
        pattern: string;
    }): Promise<ResolveSearchSourcesResponse>;
    getWorkflow(workflowId: string): Promise<GetWorkflowResponse>;
    listWorkflows({ page, limit }: {
        page?: number;
        limit?: number;
    }): Promise<ListWorkflowsResponse>;
    getToolTypes(): Promise<import("../../../common/tools").ToolTypeInfo[]>;
    listConnectors({ type }: {
        type?: string;
    }): Promise<ListConnectorsResponse>;
    getConnector({ connectorId }: {
        connectorId: string;
    }): Promise<GetConnectorResponse>;
    bulkDeleteConnectors(connectorIds: string[]): Promise<BulkDeleteConnectorsResponse>;
    listMcpTools({ connectorId }: {
        connectorId: string;
    }): Promise<ListMcpToolsResponse>;
    listToolsHealth(): Promise<ListToolHealthResponse>;
    getToolHealth({ toolId }: {
        toolId: string;
    }): Promise<GetToolHealthResponse>;
    listMcpToolsHealth(): Promise<ListMcpToolsHealthResponse>;
    bulkCreateMcpTools({ connectorId, tools, namespace, tags, skipExisting, }: {
        connectorId: string;
        tools: Array<{
            name: string;
            description?: string;
        }>;
        namespace?: string;
        tags?: string[];
        skipExisting?: boolean;
    }): Promise<BulkCreateMcpToolsResponse>;
    validateNamespace({ namespace, connectorId }: {
        namespace: string;
        connectorId?: string;
    }): Promise<ValidateNamespaceResponse>;
}
