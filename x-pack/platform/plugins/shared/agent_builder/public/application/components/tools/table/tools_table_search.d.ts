import type { Search } from '@elastic/eui';
import type { ToolDefinition } from '@kbn/agent-builder-common';
export interface ToolsTableSearch {
    searchConfig: Search;
    results: ToolDefinition[];
}
export declare const useToolsTableSearch: () => ToolsTableSearch;
