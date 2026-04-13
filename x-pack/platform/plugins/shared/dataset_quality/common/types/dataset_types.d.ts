import * as t from 'io-ts';
export declare const dataStreamTypesRt: t.KeyofC<{
    logs: null;
    metrics: null;
    traces: null;
    synthetics: null;
    profiling: null;
}>;
export type DataStreamType = t.TypeOf<typeof dataStreamTypesRt>;
export declare const dataStreamSelectorsRt: t.KeyofC<{
    "::failures": null;
    "::data": null;
}>;
export type DataStreamSelector = t.TypeOf<typeof dataStreamSelectorsRt>;
