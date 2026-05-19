import * as t from 'io-ts';
declare const fetchSLOHealthResponseSchema: t.ArrayC<t.TypeC<{
    id: t.Type<string, string, unknown>;
    instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
    revision: t.NumberC;
    name: t.StringC;
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
}>>;
declare const fetchSLOHealthParamsSchema: t.TypeC<{
    body: t.TypeC<{
        list: t.ArrayC<t.TypeC<{
            id: t.Type<string, string, unknown>;
            instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
        }>>;
    }>;
}>;
type FetchSLOHealthResponse = t.OutputOf<typeof fetchSLOHealthResponseSchema>;
type FetchSLOHealthParams = t.TypeOf<typeof fetchSLOHealthParamsSchema.props.body>;
export { fetchSLOHealthParamsSchema, fetchSLOHealthResponseSchema };
export type { FetchSLOHealthParams, FetchSLOHealthResponse };
