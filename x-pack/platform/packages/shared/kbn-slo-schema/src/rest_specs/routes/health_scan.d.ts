import * as t from 'io-ts';
declare const postHealthScanParamsSchema: t.PartialC<{
    body: t.PartialC<{
        force: t.Type<boolean, boolean, unknown>;
    }>;
}>;
interface PostHealthScanResponse {
    scanId: string;
    scheduledAt: string;
    status: 'scheduled' | 'pending' | 'completed';
    processed?: number;
    problematic?: number;
    error?: string;
}
declare const getHealthScanParamsSchema: t.IntersectionC<[t.TypeC<{
    path: t.TypeC<{
        scanId: t.StringC;
    }>;
}>, t.PartialC<{
    query: t.PartialC<{
        size: t.Type<number, number, unknown>;
        searchAfter: t.StringC;
        problematic: t.Type<boolean, boolean, unknown>;
        allSpaces: t.Type<boolean, boolean, unknown>;
    }>;
}>]>;
declare const listHealthScanParamsSchema: t.PartialC<{
    query: t.PartialC<{
        size: t.Type<number, number, unknown>;
    }>;
}>;
interface HealthScanSummary {
    scanId: string;
    latestTimestamp: string;
    total: number;
    problematic: number;
    status: 'pending' | 'completed';
}
interface ListHealthScanResponse {
    scans: HealthScanSummary[];
}
declare const healthScanResultResponseSchema: t.TypeC<{
    '@timestamp': t.BrandC<t.StringC, import("@kbn/io-ts-utils/src/date_rt").DateBrand>;
    scanId: t.StringC;
    spaceId: t.StringC;
    slo: t.TypeC<{
        id: t.StringC;
        name: t.StringC;
        revision: t.NumberC;
        enabled: t.BooleanC;
    }>;
    health: t.TypeC<{
        isProblematic: t.BooleanC;
        rollup: t.IntersectionC<[t.TypeC<{
            isProblematic: t.BooleanC;
            missing: t.BooleanC;
            status: t.UnionC<[t.LiteralC<"healthy">, t.LiteralC<"unhealthy">, t.LiteralC<"unavailable">]>;
            state: t.UnionC<[t.LiteralC<"stopped">, t.LiteralC<"started">, t.LiteralC<"stopping">, t.LiteralC<"aborting">, t.LiteralC<"failed">, t.LiteralC<"indexing">, t.LiteralC<"unavailable">]>;
        }>, t.PartialC<{
            stateMatches: t.BooleanC;
        }>]>;
        summary: t.IntersectionC<[t.TypeC<{
            isProblematic: t.BooleanC;
            missing: t.BooleanC;
            status: t.UnionC<[t.LiteralC<"healthy">, t.LiteralC<"unhealthy">, t.LiteralC<"unavailable">]>;
            state: t.UnionC<[t.LiteralC<"stopped">, t.LiteralC<"started">, t.LiteralC<"stopping">, t.LiteralC<"aborting">, t.LiteralC<"failed">, t.LiteralC<"indexing">, t.LiteralC<"unavailable">]>;
        }>, t.PartialC<{
            stateMatches: t.BooleanC;
        }>]>;
    }>;
}>;
type HealthScanResultResponse = t.OutputOf<typeof healthScanResultResponseSchema>;
interface GetHealthScanResultsResponse {
    results: HealthScanResultResponse[];
    scan: HealthScanSummary;
    total: number;
    searchAfter?: Array<string | number | null | boolean>;
}
export { getHealthScanParamsSchema, listHealthScanParamsSchema, postHealthScanParamsSchema };
export type { GetHealthScanResultsResponse, HealthScanResultResponse, HealthScanSummary, ListHealthScanResponse, PostHealthScanResponse, };
