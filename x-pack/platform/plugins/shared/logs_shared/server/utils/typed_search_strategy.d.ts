import * as rt from 'io-ts';
import type { JsonValue } from '@kbn/utility-types';
import type { SearchStrategyError } from '../../common/search_strategies/common/errors';
import type { ShardFailure } from './elasticsearch_runtime_types';
export declare const jsonFromBase64StringRT: rt.Type<JsonValue, string, string>;
export declare const createAsyncRequestRTs: <StateCodec extends rt.Mixed, ParamsCodec extends rt.Mixed>(stateCodec: StateCodec, paramsCodec: ParamsCodec) => {
    asyncInitialRequestRT: rt.TypeC<{
        id: rt.UndefinedC;
        params: ParamsCodec;
    }>;
    asyncRecoveredRequestRT: rt.TypeC<{
        id: StateCodec;
        params: ParamsCodec;
    }>;
    asyncRequestRT: rt.UnionC<[rt.TypeC<{
        id: StateCodec;
        params: ParamsCodec;
    }>, rt.TypeC<{
        id: rt.UndefinedC;
        params: ParamsCodec;
    }>]>;
};
export declare const createErrorFromShardFailure: (failure: ShardFailure) => SearchStrategyError;
