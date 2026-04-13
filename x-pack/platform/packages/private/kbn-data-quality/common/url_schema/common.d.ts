import * as rt from 'io-ts';
export declare const DATA_QUALITY_URL_STATE_KEY = "pageState";
export declare const qualityIssuesRT: rt.KeyofC<{
    degraded: null;
    failed: null;
}>;
export declare const directionRT: rt.KeyofC<{
    asc: null;
    desc: null;
}>;
export declare const sortRT: rt.ExactC<rt.TypeC<{
    field: rt.StringC;
    direction: rt.KeyofC<{
        asc: null;
        desc: null;
    }>;
}>>;
export declare const tableRT: rt.ExactC<rt.PartialC<{
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
export declare const timeRangeRT: rt.ExactC<rt.TypeC<{
    from: rt.StringC;
    to: rt.StringC;
    refresh: rt.ExactC<rt.TypeC<{
        pause: rt.BooleanC;
        value: rt.NumberC;
    }>>;
}>>;
export declare const degradedFieldRT: rt.ExactC<rt.PartialC<{
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
export declare const dataStreamRT: rt.Type<string, string, unknown>;
