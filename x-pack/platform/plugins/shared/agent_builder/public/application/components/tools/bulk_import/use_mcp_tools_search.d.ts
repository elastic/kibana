import type { Search } from '@elastic/eui';
import type { Tool as McpTool } from '@kbn/mcp-client';
export interface McpToolsSearch {
    searchConfig: Search;
    searchQuery: string;
    results: McpTool[];
}
export interface UseMcpToolsSearchOptions {
    tools: readonly McpTool[];
    isDisabled?: boolean;
}
export declare const useMcpToolsSearch: ({ tools, isDisabled, }: UseMcpToolsSearchOptions) => McpToolsSearch;
