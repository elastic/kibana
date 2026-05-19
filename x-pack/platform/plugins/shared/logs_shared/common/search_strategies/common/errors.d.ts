import * as rt from 'io-ts';
declare const abortedRequestSearchStrategyErrorRT: rt.TypeC<{
    type: rt.LiteralC<"aborted">;
}>;
export type AbortedRequestSearchStrategyError = rt.TypeOf<typeof abortedRequestSearchStrategyErrorRT>;
declare const genericSearchStrategyErrorRT: rt.TypeC<{
    type: rt.LiteralC<"generic">;
    message: rt.StringC;
}>;
export type GenericSearchStrategyError = rt.TypeOf<typeof genericSearchStrategyErrorRT>;
declare const shardFailureSearchStrategyErrorRT: rt.TypeC<{
    type: rt.LiteralC<"shardFailure">;
    shardInfo: rt.TypeC<{
        shard: rt.UnionC<[rt.NumberC, rt.NullC]>;
        index: rt.UnionC<[rt.StringC, rt.NullC]>;
        node: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>;
    message: rt.UnionC<[rt.StringC, rt.NullC]>;
}>;
export type ShardFailureSearchStrategyError = rt.TypeOf<typeof shardFailureSearchStrategyErrorRT>;
export declare const searchStrategyErrorRT: rt.UnionC<[rt.TypeC<{
    type: rt.LiteralC<"aborted">;
}>, rt.TypeC<{
    type: rt.LiteralC<"generic">;
    message: rt.StringC;
}>, rt.TypeC<{
    type: rt.LiteralC<"shardFailure">;
    shardInfo: rt.TypeC<{
        shard: rt.UnionC<[rt.NumberC, rt.NullC]>;
        index: rt.UnionC<[rt.StringC, rt.NullC]>;
        node: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>;
    message: rt.UnionC<[rt.StringC, rt.NullC]>;
}>]>;
export type SearchStrategyError = rt.TypeOf<typeof searchStrategyErrorRT>;
export {};
