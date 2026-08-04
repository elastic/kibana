import * as t from 'io-ts';
declare const findSLOGroupsParamsSchema: t.PartialC<{
    query: t.PartialC<{
        page: t.StringC;
        perPage: t.StringC;
        groupBy: t.UnionC<[t.LiteralC<"ungrouped">, t.LiteralC<"slo.tags">, t.LiteralC<"status">, t.LiteralC<"slo.indicator.type">, t.LiteralC<"slo.instanceId">, t.LiteralC<"_index">, t.LiteralC<"slo.id">]>;
        groupsFilter: t.UnionC<[t.ArrayC<t.StringC>, t.StringC]>;
        kqlQuery: t.StringC;
        filters: t.StringC;
    }>;
}>;
declare const sloGroupWithSummaryResponseSchema: t.TypeC<{
    group: t.StringC;
    groupBy: t.UnionC<[t.LiteralC<"ungrouped">, t.LiteralC<"slo.tags">, t.LiteralC<"status">, t.LiteralC<"slo.indicator.type">, t.LiteralC<"slo.instanceId">, t.LiteralC<"_index">, t.LiteralC<"slo.id">]>;
    summary: t.TypeC<{
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
}>;
declare const findSLOGroupsResponseSchema: t.TypeC<{
    page: t.NumberC;
    perPage: t.NumberC;
    total: t.NumberC;
    results: t.ArrayC<t.TypeC<{
        group: t.StringC;
        groupBy: t.UnionC<[t.LiteralC<"ungrouped">, t.LiteralC<"slo.tags">, t.LiteralC<"status">, t.LiteralC<"slo.indicator.type">, t.LiteralC<"slo.instanceId">, t.LiteralC<"_index">, t.LiteralC<"slo.id">]>;
        summary: t.TypeC<{
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
    }>>;
}>;
type FindSLOGroupsParams = t.TypeOf<typeof findSLOGroupsParamsSchema.props.query>;
type FindSLOGroupsResponse = t.OutputOf<typeof findSLOGroupsResponseSchema>;
export { findSLOGroupsParamsSchema, findSLOGroupsResponseSchema, sloGroupWithSummaryResponseSchema, };
export type { FindSLOGroupsParams, FindSLOGroupsResponse };
