export interface McpToolField {
    name: string;
    description: string;
}
export interface BulkImportMcpToolsFormData {
    connectorId: string;
    tools: McpToolField[];
    namespace: string;
    labels: string[];
}
