import * as t from 'io-ts';
import { ALL_VALUE } from '../constants';
declare const allOrAnyString: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
declare const allOrAnyStringOrArray: t.UnionC<[t.LiteralC<"*">, t.StringC, t.ArrayC<t.UnionC<[t.LiteralC<"*">, t.StringC]>>]>;
declare const dateType: t.Type<Date, string, unknown>;
declare const errorBudgetSchema: t.TypeC<{
    initial: t.NumberC;
    consumed: t.NumberC;
    remaining: t.NumberC;
    isEstimated: t.BooleanC;
}>;
declare const SLO_STATUS: {
    readonly NO_DATA: "NO_DATA";
    readonly HEALTHY: "HEALTHY";
    readonly DEGRADING: "DEGRADING";
    readonly VIOLATED: "VIOLATED";
};
declare const statusSchema: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
declare const summarySchema: t.IntersectionC<[t.TypeC<{
    status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
    sliValue: t.NumberC;
    errorBudget: t.TypeC<{
        initial: t.NumberC;
        consumed: t.NumberC;
        remaining: t.NumberC;
        isEstimated: t.BooleanC;
    }>;
    fiveMinuteBurnRate: t.NumberC;
    oneHourBurnRate: t.NumberC;
    oneDayBurnRate: t.NumberC;
}>, t.PartialC<{
    summaryUpdatedAt: t.UnionC<[t.StringC, t.NullC]>;
}>]>;
declare const groupingsSchema: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.NumberC]>>;
declare const metaSchema: t.PartialC<{
    synthetics: t.TypeC<{
        monitorId: t.StringC;
        locationId: t.StringC;
        configId: t.StringC;
    }>;
}>;
declare const remoteSchema: t.TypeC<{
    remoteName: t.StringC;
    kibanaUrl: t.StringC;
}>;
declare const groupSummarySchema: t.TypeC<{
    total: t.NumberC;
    worst: t.TypeC<{
        sliValue: t.NumberC;
        status: t.StringC;
        slo: t.IntersectionC<[t.TypeC<{
            id: t.StringC;
            instanceId: t.StringC;
            name: t.StringC;
        }>, t.PartialC<{
            groupings: t.RecordC<t.StringC, t.UnknownC>;
        }>]>;
    }>;
    violated: t.NumberC;
    healthy: t.NumberC;
    degrading: t.NumberC;
    noData: t.NumberC;
}>;
declare const dateRangeSchema: t.TypeC<{
    from: t.Type<Date, string, unknown>;
    to: t.Type<Date, string, unknown>;
}>;
export type SLOStatus = t.TypeOf<typeof statusSchema>;
export { ALL_VALUE, SLO_STATUS, allOrAnyString, allOrAnyStringOrArray, dateRangeSchema, dateType, errorBudgetSchema, groupingsSchema, statusSchema, summarySchema, metaSchema, groupSummarySchema, remoteSchema, };
