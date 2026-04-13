import * as rt from 'io-ts';
export declare const urlSchemaRT: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
    dataStream: rt.Type<string, string, unknown>;
}>, rt.PartialC<{
    v: rt.LiteralC<1>;
    timeRange: rt.ExactC<rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        refresh: rt.ExactC<rt.TypeC<{
            pause: rt.BooleanC;
            value: rt.NumberC;
        }>>;
    }>>;
    breakdownField: rt.StringC;
    degradedFields: rt.ExactC<rt.PartialC<{
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
    }>>;
    expandedDegradedField: rt.StringC;
    showCurrentQualityIssues: rt.BooleanC;
}>]>>;
export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
