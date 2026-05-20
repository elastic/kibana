import type { ISearchGeneric } from '@kbn/search-types';
import type { LogCategorizationParams } from './types';
export declare const countDocuments: ({ search }: {
    search: ISearchGeneric;
}) => import("xstate").PromiseActorLogic<{
    documentCount: number;
    samplingProbability: number;
}, LogCategorizationParams, import("xstate").EventObject>;
