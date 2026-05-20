import type { estypes } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import type { LogEntryAfterCursor, LogEntryBeforeCursor } from '../../../../common/log_entry';
import type { JsonObject } from '../../../../common/typed_json';
export declare const createGetLogEntriesQuery: (logEntriesIndex: string, startTimestamp: number, endTimestamp: number, cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined, size: number, timestampField: string, tiebreakerField: string, fields: string[], runtimeMappings?: estypes.MappingRuntimeFields, query?: JsonObject, highlightTerm?: string) => estypes.AsyncSearchSubmitRequest;
export declare const getSortDirection: (cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined) => "asc" | "desc";
export declare const logEntryHitRT: rt.IntersectionC<[rt.TypeC<{
    _index: rt.StringC;
    _id: rt.StringC;
}>, rt.TypeC<{
    sort: rt.TupleC<[rt.StringC, rt.NumberC]>;
}>, rt.PartialC<{
    fields: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>>;
    highlight: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
}>]>;
export type LogEntryHit = rt.TypeOf<typeof logEntryHitRT>;
export declare const getLogEntriesResponseRT: rt.IntersectionC<[rt.TypeC<{
    _shards: rt.IntersectionC<[rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>, rt.PartialC<{
        failures: rt.ArrayC<rt.PartialC<{
            index: rt.UnionC<[rt.StringC, rt.NullC]>;
            node: rt.UnionC<[rt.StringC, rt.NullC]>;
            reason: rt.PartialC<{
                reason: rt.UnionC<[rt.StringC, rt.NullC]>;
                type: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>;
            shard: rt.NumberC;
        }>>;
    }>]>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    hits: rt.TypeC<{
        hits: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            _index: rt.StringC;
            _id: rt.StringC;
        }>, rt.TypeC<{
            sort: rt.TupleC<[rt.StringC, rt.NumberC]>;
        }>, rt.PartialC<{
            fields: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>>;
            highlight: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
        }>]>>;
    }>;
}>]>;
export type GetLogEntriesResponse = rt.TypeOf<typeof getLogEntriesResponseRT>;
