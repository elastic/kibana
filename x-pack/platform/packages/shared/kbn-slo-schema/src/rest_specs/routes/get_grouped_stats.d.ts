import * as t from 'io-ts';
declare const getSLOGroupedStatsParamsSchema: t.TypeC<{
    body: t.IntersectionC<[t.TypeC<{
        /**
         * SLO type.
         */
        type: t.LiteralC<"apm">;
    }>, t.PartialC<{
        /**
         * Number of buckets to return.
         * If not provided, the query will use elasticsearch default value of 10.
         */
        size: t.NumberC;
        /**
         * List of service names to filter by.
         */
        serviceNames: t.ArrayC<t.StringC>;
        /**
         * Environment to filter by.
         */
        environment: t.StringC;
        /**
         * KQL query to filter SLOs.
         */
        kqlQuery: t.StringC;
        /**
         * List of statuses to filter by (e.g. ['VIOLATED', 'DEGRADING']).
         */
        statusFilters: t.ArrayC<t.StringC>;
    }>]>;
}>;
interface GroupedStatsResult {
    entity: string;
    summary: {
        violated: number;
        degrading: number;
        healthy: number;
        noData: number;
    };
}
interface GetSLOGroupedStatsResponse {
    results: Array<GroupedStatsResult>;
}
type GetSLOGroupedStatsParams = t.TypeOf<typeof getSLOGroupedStatsParamsSchema>['body'];
export { getSLOGroupedStatsParamsSchema };
export type { GroupedStatsResult, GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse };
