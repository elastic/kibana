import { type Search } from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
export interface McpClientsTableSearch {
    searchConfig: Search;
    results: OAuthClient[];
}
export interface UseMcpClientsTableSearchOptions {
    clients: OAuthClient[];
}
export declare const useMcpClientsTableSearch: ({ clients, }: UseMcpClientsTableSearchOptions) => McpClientsTableSearch;
