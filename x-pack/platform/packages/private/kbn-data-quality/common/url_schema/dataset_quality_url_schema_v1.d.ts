import * as rt from 'io-ts';
export declare const filtersRT: rt.ExactC<rt.PartialC<{
    inactive: rt.BooleanC;
    fullNames: rt.BooleanC;
    timeRange: rt.ExactC<rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        refresh: rt.ExactC<rt.TypeC<{
            pause: rt.BooleanC;
            value: rt.NumberC;
        }>>;
    }>>;
    types: rt.ArrayC<rt.StringC>;
    integrations: rt.ArrayC<rt.StringC>;
    namespaces: rt.ArrayC<rt.StringC>;
    qualities: rt.ArrayC<rt.UnionC<[rt.LiteralC<"poor">, rt.LiteralC<"degraded">, rt.LiteralC<"good">]>>;
    query: rt.StringC;
}>>;
export declare const urlSchemaRT: rt.ExactC<rt.PartialC<{
    v: rt.LiteralC<1>;
    table: rt.ExactC<rt.PartialC<{
        page: rt.NumberC;
        rowsPerPage: rt.NumberC;
        sort: rt.ExactC<rt.TypeC<{
            field: rt.StringC;
            direction: rt.KeyofC<{
                asc: null;
                desc: null;
            }>;
        }>>;
    }>>;
    filters: rt.ExactC<rt.PartialC<{
        inactive: rt.BooleanC;
        fullNames: rt.BooleanC;
        timeRange: rt.ExactC<rt.TypeC<{
            from: rt.StringC;
            to: rt.StringC;
            refresh: rt.ExactC<rt.TypeC<{
                pause: rt.BooleanC;
                value: rt.NumberC;
            }>>;
        }>>;
        types: rt.ArrayC<rt.StringC>;
        integrations: rt.ArrayC<rt.StringC>;
        namespaces: rt.ArrayC<rt.StringC>;
        qualities: rt.ArrayC<rt.UnionC<[rt.LiteralC<"poor">, rt.LiteralC<"degraded">, rt.LiteralC<"good">]>>;
        query: rt.StringC;
    }>>;
}>>;
export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
