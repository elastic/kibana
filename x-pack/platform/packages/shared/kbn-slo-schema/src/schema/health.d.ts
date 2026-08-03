import * as t from 'io-ts';
/**
 * IMPORTANT: Any changes to this file must be carefully checked against both usage
 * from the SLO definitions API and the SLO Health API, as both depend on these shared types.
 * One is a public API, the other is an internal API.
 * If types need to diverge, they should be split into separate files.
 */
declare const transformHealthSchema: t.IntersectionC<[t.TypeC<{
    isProblematic: t.BooleanC;
    missing: t.BooleanC;
    status: t.UnionC<[t.LiteralC<"healthy">, t.LiteralC<"unhealthy">, t.LiteralC<"unavailable">]>;
    state: t.UnionC<[t.LiteralC<"stopped">, t.LiteralC<"started">, t.LiteralC<"stopping">, t.LiteralC<"aborting">, t.LiteralC<"failed">, t.LiteralC<"indexing">, t.LiteralC<"unavailable">]>;
}>, t.PartialC<{
    stateMatches: t.BooleanC;
}>]>;
export type TransformHealthResponse = t.OutputOf<typeof transformHealthSchema>;
export { transformHealthSchema };
