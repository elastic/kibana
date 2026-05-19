import * as t from 'io-ts';
declare const findSLOInstancesParamsSchema: t.IntersectionC<[t.TypeC<{
    path: t.TypeC<{
        id: t.StringC;
    }>;
}>, t.PartialC<{
    query: t.PartialC<{
        search: t.StringC;
        size: t.Type<number, number, unknown>;
        searchAfter: t.StringC;
        remoteName: t.StringC;
    }>;
}>]>;
interface FindSLOInstancesResponse {
    results: Array<{
        instanceId: string;
        groupings: Record<string, string | number>;
    }>;
    searchAfter?: string;
}
interface FindSLOInstancesParams {
    sloId: string;
    spaceId: string;
    search?: string;
    size?: number;
    searchAfter?: string;
    remoteName?: string;
}
export { findSLOInstancesParamsSchema };
export type { FindSLOInstancesParams, FindSLOInstancesResponse };
