import type { BulkCreateMcpToolsResponse } from '../../../../common/http_api/tools';
export interface BulkImportMcpToolsOptions {
    connectorId: string;
    tools: Array<{
        name: string;
        description?: string;
    }>;
    namespace?: string;
    tags?: string[];
    skipExisting?: boolean;
}
export declare const useBulkImportMcpTools: () => import("@kbn/react-query").UseMutationResult<BulkCreateMcpToolsResponse, unknown, BulkImportMcpToolsOptions, unknown>;
