export declare enum McpToolHealthStatus {
    Healthy = "healthy",
    ToolNotFound = "tool_not_found",
    ConnectorNotFound = "connector_not_found",
    ListToolsFailed = "list_tools_failed",
    ToolUnhealthy = "tool_unhealthy"
}
export type McpToolUnhealthyStatus = Exclude<McpToolHealthStatus, McpToolHealthStatus.Healthy>;
export declare const mcpUnhealthyStatusIconMap: Record<McpToolUnhealthyStatus, string>;
export interface McpConfigurationFieldsProps {
    mcpHealthStatus?: McpToolHealthStatus;
    setMcpHealthStatus: (status: McpToolHealthStatus) => void;
}
