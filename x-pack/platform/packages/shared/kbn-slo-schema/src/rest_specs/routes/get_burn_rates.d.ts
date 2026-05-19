import * as t from 'io-ts';
declare const getSLOBurnRatesResponseSchema: t.TypeC<{
    burnRates: t.ArrayC<t.TypeC<{
        name: t.StringC;
        burnRate: t.NumberC;
        sli: t.NumberC;
    }>>;
}>;
declare const getSLOBurnRatesParamsSchema: t.TypeC<{
    path: t.TypeC<{
        id: t.StringC;
    }>;
    body: t.IntersectionC<[t.TypeC<{
        instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
        windows: t.ArrayC<t.TypeC<{
            name: t.StringC;
            duration: t.Type<import("../../models").Duration, string, unknown>;
        }>>;
    }>, t.PartialC<{
        remoteName: t.StringC;
    }>]>;
}>;
type GetSLOBurnRatesResponse = t.OutputOf<typeof getSLOBurnRatesResponseSchema>;
export { getSLOBurnRatesParamsSchema, getSLOBurnRatesResponseSchema };
export type { GetSLOBurnRatesResponse };
