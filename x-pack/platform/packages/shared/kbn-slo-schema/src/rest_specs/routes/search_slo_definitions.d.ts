import * as t from 'io-ts';
declare const searchSLODefinitionsParamsSchema: t.PartialC<{
    query: t.PartialC<{
        search: t.StringC;
        size: t.Type<number, number, unknown>;
        searchAfter: t.StringC;
        remoteName: t.StringC;
    }>;
}>;
type SearchSLODefinitionsParams = t.TypeOf<typeof searchSLODefinitionsParamsSchema.props.query>;
interface SearchSLODefinitionItem {
    id: string;
    name: string;
    groupBy: string[];
    remote?: {
        remoteName: string;
        kibanaUrl: string;
    };
}
interface SearchSLODefinitionResponse {
    results: SearchSLODefinitionItem[];
    searchAfter?: string;
}
export { searchSLODefinitionsParamsSchema };
export type { SearchSLODefinitionsParams, SearchSLODefinitionResponse, SearchSLODefinitionItem };
