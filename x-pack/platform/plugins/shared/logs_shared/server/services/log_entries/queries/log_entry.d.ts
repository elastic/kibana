import type { estypes } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
export declare const createGetLogEntryQuery: (logEntryIndex: string, logEntryId: string, timestampField: string, tiebreakerField: string, runtimeMappings?: estypes.MappingRuntimeFields) => estypes.AsyncSearchSubmitRequest;
export declare const logEntryHitRT: rt.IntersectionC<[rt.TypeC<{
    _index: rt.StringC;
    _id: rt.StringC;
}>, rt.TypeC<{
    sort: rt.TupleC<[rt.StringC, rt.NumberC]>;
}>, rt.PartialC<{
    fields: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>>;
}>]>;
export type LogEntryHit = rt.TypeOf<typeof logEntryHitRT>;
export declare const getLogEntryResponseRT: rt.IntersectionC<[rt.TypeC<{
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
        }>]>>;
    }>;
}>]>;
export type GetLogEntryResponse = rt.TypeOf<typeof getLogEntryResponseRT>;
