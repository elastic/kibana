import * as rt from 'io-ts';
export declare const logEntryCursorRT: rt.TypeC<{
    time: rt.StringC;
    tiebreaker: rt.NumberC;
}>;
export type LogEntryCursor = rt.TypeOf<typeof logEntryCursorRT>;
export declare const logEntryBeforeCursorRT: rt.TypeC<{
    before: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"last">]>;
}>;
export type LogEntryBeforeCursor = rt.TypeOf<typeof logEntryBeforeCursorRT>;
export declare const logEntryAfterCursorRT: rt.TypeC<{
    after: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"first">]>;
}>;
export type LogEntryAfterCursor = rt.TypeOf<typeof logEntryAfterCursorRT>;
export declare const logEntryAroundCursorRT: rt.TypeC<{
    center: rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>;
}>;
export type LogEntryAroundCursor = rt.TypeOf<typeof logEntryAroundCursorRT>;
export declare const getLogEntryCursorFromHit: (hit: {
    sort: [string, number];
}) => {
    time: string;
    tiebreaker: number;
};
