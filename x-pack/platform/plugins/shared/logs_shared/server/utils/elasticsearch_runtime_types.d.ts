import * as rt from 'io-ts';
export declare const shardFailureRT: rt.PartialC<{
    index: rt.UnionC<[rt.StringC, rt.NullC]>;
    node: rt.UnionC<[rt.StringC, rt.NullC]>;
    reason: rt.PartialC<{
        reason: rt.UnionC<[rt.StringC, rt.NullC]>;
        type: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>;
    shard: rt.NumberC;
}>;
export type ShardFailure = rt.TypeOf<typeof shardFailureRT>;
export declare const commonSearchSuccessResponseFieldsRT: rt.TypeC<{
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
}>;
export declare const commonHitFieldsRT: rt.TypeC<{
    _index: rt.StringC;
    _id: rt.StringC;
}>;
