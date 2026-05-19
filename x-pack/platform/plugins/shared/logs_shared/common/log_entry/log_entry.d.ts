import type { TimeKey } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
export type LogEntryTime = TimeKey;
/**
 * message parts
 */
export declare const logMessageConstantPartRT: rt.TypeC<{
    constant: rt.StringC;
}>;
export type LogMessageConstantPart = rt.TypeOf<typeof logMessageConstantPartRT>;
export declare const logMessageFieldPartRT: rt.TypeC<{
    field: rt.StringC;
    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
    highlights: rt.ArrayC<rt.StringC>;
}>;
export type LogMessageFieldPart = rt.TypeOf<typeof logMessageFieldPartRT>;
export declare const logMessagePartRT: rt.UnionC<[rt.TypeC<{
    constant: rt.StringC;
}>, rt.TypeC<{
    field: rt.StringC;
    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
    highlights: rt.ArrayC<rt.StringC>;
}>]>;
export type LogMessagePart = rt.TypeOf<typeof logMessagePartRT>;
/**
 * columns
 */
export declare const logTimestampColumnRT: rt.TypeC<{
    columnId: rt.StringC;
    time: rt.StringC;
}>;
export type LogTimestampColumn = rt.TypeOf<typeof logTimestampColumnRT>;
export declare const logFieldColumnRT: rt.TypeC<{
    columnId: rt.StringC;
    field: rt.StringC;
    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
    highlights: rt.ArrayC<rt.StringC>;
}>;
export type LogFieldColumn = rt.TypeOf<typeof logFieldColumnRT>;
export declare const logMessageColumnRT: rt.TypeC<{
    columnId: rt.StringC;
    message: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        constant: rt.StringC;
    }>, rt.TypeC<{
        field: rt.StringC;
        value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
        highlights: rt.ArrayC<rt.StringC>;
    }>]>>;
}>;
export type LogMessageColumn = rt.TypeOf<typeof logMessageColumnRT>;
export declare const logColumnRT: rt.UnionC<[rt.TypeC<{
    columnId: rt.StringC;
    time: rt.StringC;
}>, rt.TypeC<{
    columnId: rt.StringC;
    field: rt.StringC;
    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
    highlights: rt.ArrayC<rt.StringC>;
}>, rt.TypeC<{
    columnId: rt.StringC;
    message: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        constant: rt.StringC;
    }>, rt.TypeC<{
        field: rt.StringC;
        value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
        highlights: rt.ArrayC<rt.StringC>;
    }>]>>;
}>]>;
export type LogColumn = rt.TypeOf<typeof logColumnRT>;
/**
 * fields
 */
export declare const logEntryContextRT: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
    'container.id': rt.StringC;
}>, rt.TypeC<{
    'host.name': rt.StringC;
    'log.file.path': rt.StringC;
}>]>;
export type LogEntryContext = rt.TypeOf<typeof logEntryContextRT>;
export declare const logEntryFieldRT: rt.TypeC<{
    field: rt.StringC;
    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
}>;
export type LogEntryField = rt.TypeOf<typeof logEntryFieldRT>;
/**
 * entry
 */
export declare const logEntryRT: rt.TypeC<{
    id: rt.StringC;
    index: rt.StringC;
    cursor: rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>;
    columns: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        columnId: rt.StringC;
        time: rt.StringC;
    }>, rt.TypeC<{
        columnId: rt.StringC;
        field: rt.StringC;
        value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
        highlights: rt.ArrayC<rt.StringC>;
    }>, rt.TypeC<{
        columnId: rt.StringC;
        message: rt.ArrayC<rt.UnionC<[rt.TypeC<{
            constant: rt.StringC;
        }>, rt.TypeC<{
            field: rt.StringC;
            value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
            highlights: rt.ArrayC<rt.StringC>;
        }>]>>;
    }>]>>;
    context: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
        'container.id': rt.StringC;
    }>, rt.TypeC<{
        'host.name': rt.StringC;
        'log.file.path': rt.StringC;
    }>]>;
}>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;
