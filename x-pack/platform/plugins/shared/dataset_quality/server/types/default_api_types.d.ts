import * as t from 'io-ts';
export declare const typeRt: t.TypeC<{
    type: t.KeyofC<{
        logs: null;
        metrics: null;
        traces: null;
        synthetics: null;
        profiling: null;
    }>;
}>;
export declare const typesRt: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
export declare const rangeRt: t.TypeC<{
    start: t.Type<number, string, unknown>;
    end: t.Type<number, string, unknown>;
}>;
export declare const groupByRt: t.Type<string[], string, unknown>;
