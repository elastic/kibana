import * as rt from 'io-ts';
export declare const isStream: (value: unknown) => value is {
    dataStream: string;
    view: "classic" | "wired";
};
export declare const urlSchemaRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    dataStream: rt.StringC;
    view: rt.LiteralC<"classic">;
}>, rt.PartialC<{
    v: rt.LiteralC<2>;
    timeRange: rt.ExactC<rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        refresh: rt.ExactC<rt.TypeC<{
            pause: rt.BooleanC;
            value: rt.NumberC;
        }>>;
    }>>;
    qualityIssuesChart: rt.KeyofC<{
        degraded: null;
        failed: null;
    }>;
    breakdownField: rt.StringC;
    qualityIssues: rt.ExactC<rt.PartialC<{
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
    expandedQualityIssue: rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            degraded: null;
            failed: null;
        }>;
    }>;
    showCurrentQualityIssues: rt.BooleanC;
}>]>, rt.IntersectionC<[rt.TypeC<{
    dataStream: rt.StringC;
    view: rt.LiteralC<"wired">;
}>, rt.PartialC<{
    v: rt.LiteralC<2>;
    timeRange: rt.ExactC<rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        refresh: rt.ExactC<rt.TypeC<{
            pause: rt.BooleanC;
            value: rt.NumberC;
        }>>;
    }>>;
    qualityIssuesChart: rt.KeyofC<{
        degraded: null;
        failed: null;
    }>;
    breakdownField: rt.StringC;
    qualityIssues: rt.ExactC<rt.PartialC<{
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
    expandedQualityIssue: rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            degraded: null;
            failed: null;
        }>;
    }>;
    showCurrentQualityIssues: rt.BooleanC;
}>]>, rt.IntersectionC<[rt.TypeC<{
    dataStream: rt.Type<string, string, unknown>;
}>, rt.PartialC<{
    v: rt.LiteralC<2>;
    timeRange: rt.ExactC<rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        refresh: rt.ExactC<rt.TypeC<{
            pause: rt.BooleanC;
            value: rt.NumberC;
        }>>;
    }>>;
    qualityIssuesChart: rt.KeyofC<{
        degraded: null;
        failed: null;
    }>;
    breakdownField: rt.StringC;
    qualityIssues: rt.ExactC<rt.PartialC<{
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
    expandedQualityIssue: rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            degraded: null;
            failed: null;
        }>;
    }>;
    showCurrentQualityIssues: rt.BooleanC;
}>]>]>;
export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
