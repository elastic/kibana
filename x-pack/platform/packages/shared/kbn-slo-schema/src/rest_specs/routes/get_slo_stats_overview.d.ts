import * as t from 'io-ts';
declare const getSLOStatsOverviewParamsSchema: t.PartialC<{
    query: t.PartialC<{
        kqlQuery: t.StringC;
        filters: t.StringC;
    }>;
}>;
declare const getSLOStatsOverviewResponseSchema: t.TypeC<{
    violated: t.NumberC;
    degrading: t.NumberC;
    stale: t.NumberC;
    healthy: t.NumberC;
    noData: t.NumberC;
    burnRateRules: t.NumberC;
    burnRateActiveAlerts: t.NumberC;
    burnRateRecoveredAlerts: t.NumberC;
}>;
type GetSLOStatsOverviewParams = t.TypeOf<typeof getSLOStatsOverviewParamsSchema.props.query>;
type GetSLOStatsOverviewResponse = t.OutputOf<typeof getSLOStatsOverviewResponseSchema>;
export { getSLOStatsOverviewParamsSchema, getSLOStatsOverviewResponseSchema };
export type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse };
