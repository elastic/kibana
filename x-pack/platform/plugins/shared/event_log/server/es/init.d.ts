import type { estypes } from '@elastic/elasticsearch';
import type { EsContext } from './context';
export declare function initializeEs(esContext: EsContext): Promise<boolean>;
export interface ParsedIndexAlias extends estypes.IndicesAliasDefinition {
    indexName: string;
    alias: string;
    is_hidden?: boolean;
}
export declare function parseIndexAliases(aliasInfo: estypes.IndicesGetAliasResponse): ParsedIndexAlias[];
