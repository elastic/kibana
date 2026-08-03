import * as t from 'io-ts';
declare const fetchHistoricalSummaryParamsSchema: t.TypeC<{
    body: t.TypeC<{
        list: t.ArrayC<t.IntersectionC<[t.TypeC<{
            sloId: t.Type<string, string, unknown>;
            instanceId: t.StringC;
            timeWindow: t.UnionC<[t.TypeC<{
                duration: t.Type<import("../../models").Duration, string, unknown>;
                type: t.LiteralC<"rolling">;
            }>, t.TypeC<{
                duration: t.Type<import("../../models").Duration, string, unknown>;
                type: t.LiteralC<"calendarAligned">;
            }>]>;
            budgetingMethod: t.UnionC<[t.LiteralC<"occurrences">, t.LiteralC<"timeslices">]>;
            objective: t.IntersectionC<[t.TypeC<{
                target: t.NumberC;
            }>, t.PartialC<{
                timesliceTarget: t.NumberC;
                timesliceWindow: t.Type<import("../../models").Duration, string, unknown>;
            }>]>;
            groupBy: t.UnionC<[t.LiteralC<"*">, t.StringC, t.ArrayC<t.UnionC<[t.LiteralC<"*">, t.StringC]>>]>;
            revision: t.NumberC;
        }>, t.PartialC<{
            remoteName: t.StringC;
            range: t.TypeC<{
                from: t.Type<Date, string, unknown>;
                to: t.Type<Date, string, unknown>;
            }>;
        }>]>>;
    }>;
}>;
declare const historicalSummarySchema: t.TypeC<{
    date: t.Type<Date, string, unknown>;
    status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
    sliValue: t.NumberC;
    errorBudget: t.TypeC<{
        initial: t.NumberC;
        consumed: t.NumberC;
        remaining: t.NumberC;
        isEstimated: t.BooleanC;
    }>;
}>;
declare const fetchHistoricalSummaryResponseSchema: t.ArrayC<t.TypeC<{
    sloId: t.Type<string, string, unknown>;
    instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
    data: t.ArrayC<t.TypeC<{
        date: t.Type<Date, string, unknown>;
        status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
        sliValue: t.NumberC;
        errorBudget: t.TypeC<{
            initial: t.NumberC;
            consumed: t.NumberC;
            remaining: t.NumberC;
            isEstimated: t.BooleanC;
        }>;
    }>>;
}>>;
type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;
export { fetchHistoricalSummaryParamsSchema, fetchHistoricalSummaryResponseSchema, historicalSummarySchema, };
export type { FetchHistoricalSummaryParams, FetchHistoricalSummaryResponse, HistoricalSummaryResponse, };
